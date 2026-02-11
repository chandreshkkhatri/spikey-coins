import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { positions, wallets, transactions } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { PAIRS } from "@/lib/trading/constants";
import type { FuturesPair } from "@/lib/trading/constants";
import { getMarkPrice } from "@/lib/services/prices";
import {
  calculateUnrealizedPnl,
  calculateMaintenanceMargin,
  isLiquidatable,
} from "@/lib/services/margin";

const liquidateSchema = z.object({
  contract: z.enum(["XAU-PERP", "XAG-PERP"]),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contract } = liquidateSchema.parse(body);

    const pairConfig = PAIRS[contract as FuturesPair];
    const markData = await getMarkPrice(contract as FuturesPair);

    // Find all open positions for this contract
    const openPositions = await db
      .select()
      .from(positions)
      .where(
        and(
          eq(positions.contract, contract),
          eq(positions.status, "open")
        )
      );

    const liquidated: string[] = [];

    for (const pos of openPositions) {
      const unrealizedPnl = calculateUnrealizedPnl(
        pos.side as "long" | "short",
        pos.entryPrice,
        markData.markPrice,
        pos.quantity,
        pairConfig.contractSize
      );

      const maintenanceMargin = calculateMaintenanceMargin(
        pos.quantity,
        pairConfig.contractSize,
        markData.markPrice,
        pairConfig.maintenanceMarginRate
      );

      if (!isLiquidatable(pos.margin, unrealizedPnl, maintenanceMargin)) {
        continue;
      }

      // Liquidate this position
      await db.transaction(async (tx) => {
        // Lock position
        const [lockedPos] = await tx
          .select()
          .from(positions)
          .where(
            and(eq(positions.id, pos.id), eq(positions.status, "open"))
          )
          .for("update");

        if (!lockedPos) return;

        // Remaining margin after PnL (could be negative, but we floor at 0)
        const remainingValue = Math.max(
          0,
          parseFloat(lockedPos.margin) + unrealizedPnl
        );

        // Close the position as liquidated
        await tx
          .update(positions)
          .set({
            quantity: "0",
            status: "liquidated",
            realizedPnl: sql`${positions.realizedPnl} + ${unrealizedPnl.toFixed(8)}::decimal`,
            updatedAt: new Date(),
          })
          .where(eq(positions.id, lockedPos.id));

        // Return any remaining margin to wallet
        if (remainingValue > 0) {
          const [wallet] = await tx
            .select()
            .from(wallets)
            .where(
              and(
                eq(wallets.userId, lockedPos.userId),
                eq(wallets.currency, lockedPos.collateralCurrency)
              )
            )
            .for("update");

          if (wallet) {
            await tx
              .update(wallets)
              .set({
                balance: sql`${wallets.balance} + ${remainingValue.toFixed(8)}::decimal`,
                availableBalance: sql`${wallets.availableBalance} + ${remainingValue.toFixed(8)}::decimal`,
                updatedAt: new Date(),
              })
              .where(eq(wallets.id, wallet.id));

            const [updated] = await tx
              .select({ balance: wallets.balance })
              .from(wallets)
              .where(eq(wallets.id, wallet.id));

            await tx.insert(transactions).values({
              userId: lockedPos.userId,
              walletId: wallet.id,
              type: "liquidation",
              currency: lockedPos.collateralCurrency,
              amount: remainingValue.toFixed(8),
              balanceAfter: updated.balance,
              referenceId: lockedPos.id,
              referenceType: "position",
              description: `Liquidation of ${lockedPos.contract} ${lockedPos.side} position`,
            });
          }
        }

        liquidated.push(lockedPos.id);
      });
    }

    return NextResponse.json({
      success: true,
      liquidatedCount: liquidated.length,
      positions: liquidated,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Liquidation check failed";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
