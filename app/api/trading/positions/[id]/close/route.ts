import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { orders, positions, wallets, transactions, trades as tradesTable } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";
import { PAIRS } from "@/lib/trading/constants";
import type { FuturesPair } from "@/lib/trading/constants";
import { matchOrder } from "@/lib/services/matching";
import { calculateUnrealizedPnl } from "@/lib/services/margin";

const closeSchema = z.object({
  quantity: z.string().optional(), // partial close, full if omitted
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { quantity: closeQtyStr } = closeSchema.parse(body);

    const result = await db.transaction(async (tx) => {
      const [pos] = await tx
        .select()
        .from(positions)
        .where(
          and(
            eq(positions.id, id),
            eq(positions.userId, user.id),
            eq(positions.status, "open")
          )
        )
        .for("update");

      if (!pos) {
        throw new Error("Position not found or already closed");
      }

      const closeQty = closeQtyStr
        ? Math.min(parseFloat(closeQtyStr), parseFloat(pos.quantity))
        : parseFloat(pos.quantity);

      if (closeQty <= 0) {
        throw new Error("Close quantity must be positive");
      }

      const contract = pos.contract as FuturesPair;
      const pairConfig = PAIRS[contract];

      // Place a market order on the opposite side to close
      const closeSide = pos.side === "long" ? "sell" : "buy";

      const [closeOrder] = await tx
        .insert(orders)
        .values({
          userId: user.id,
          pair: contract,
          side: closeSide,
          type: "market",
          quantity: closeQty.toFixed(8),
          status: "open",
          collateralCurrency: pos.collateralCurrency,
        })
        .returning();

      // Run matching engine
      const matchResult = await matchOrder(tx, {
        id: closeOrder.id,
        userId: user.id,
        pair: contract,
        side: closeSide as "buy" | "sell",
        type: "market",
        price: null,
        quantity: closeQty.toFixed(8),
      });

      // Process fills
      for (const fill of matchResult.fills) {
        await tx.insert(tradesTable).values({
          pair: contract,
          makerOrderId: fill.makerOrderId,
          takerOrderId: closeOrder.id,
          makerUserId: fill.makerUserId,
          takerUserId: user.id,
          price: fill.price,
          quantity: fill.quantity,
          makerFee: fill.makerFee,
          takerFee: fill.takerFee,
        });
      }

      // Calculate PnL on filled portion
      const filledQty =
        closeQty - parseFloat(matchResult.remainingQuantity);

      // If no fills, the position can't be closed (no liquidity)
      if (filledQty < 1e-8) {
        // Cancel the close order
        await tx
          .update(orders)
          .set({ status: "cancelled", updatedAt: new Date() })
          .where(eq(orders.id, closeOrder.id));

        throw new Error(
          "Unable to close position: no matching orders in the book"
        );
      }

      // Use the average fill price for PnL calculation
      let totalNotional = 0;
      for (const fill of matchResult.fills) {
        totalNotional += parseFloat(fill.quantity) * parseFloat(fill.price);
      }
      const avgFillPrice = totalNotional / filledQty;

      const pnl = calculateUnrealizedPnl(
        pos.side as "long" | "short",
        pos.entryPrice,
        avgFillPrice.toString(),
        filledQty.toString(),
        pairConfig.contractSize
      );

      // Release proportional margin
      const marginRelease =
        (filledQty / parseFloat(pos.quantity)) * parseFloat(pos.margin);

      const remainingQty = parseFloat(pos.quantity) - filledQty;

      if (remainingQty < 1e-8) {
        // Fully closed
        await tx
          .update(positions)
          .set({
            quantity: "0",
            status: "closed",
            realizedPnl: sql`${positions.realizedPnl} + ${pnl.toFixed(8)}::decimal`,
            updatedAt: new Date(),
          })
          .where(eq(positions.id, pos.id));
      } else {
        // Partially closed
        const remainingMargin = parseFloat(pos.margin) - marginRelease;
        await tx
          .update(positions)
          .set({
            quantity: remainingQty.toFixed(8),
            margin: remainingMargin.toFixed(8),
            realizedPnl: sql`${positions.realizedPnl} + ${pnl.toFixed(8)}::decimal`,
            updatedAt: new Date(),
          })
          .where(eq(positions.id, pos.id));
      }

      // Credit PnL + margin to wallet
      const totalCredit = pnl + marginRelease;
      const [wallet] = await tx
        .select()
        .from(wallets)
        .where(
          and(
            eq(wallets.userId, user.id),
            eq(wallets.currency, pos.collateralCurrency)
          )
        )
        .for("update");

      if (wallet) {
        await tx
          .update(wallets)
          .set({
            balance: sql`${wallets.balance} + ${totalCredit.toFixed(8)}::decimal`,
            availableBalance: sql`${wallets.availableBalance} + ${totalCredit.toFixed(8)}::decimal`,
            updatedAt: new Date(),
          })
          .where(eq(wallets.id, wallet.id));

        const [updated] = await tx
          .select({ balance: wallets.balance })
          .from(wallets)
          .where(eq(wallets.id, wallet.id));

        await tx.insert(transactions).values({
          userId: user.id,
          walletId: wallet.id,
          type: "margin_release",
          currency: pos.collateralCurrency,
          amount: totalCredit.toFixed(8),
          balanceAfter: updated.balance,
          referenceId: pos.id,
          referenceType: "position",
          description: `Close ${pos.contract} ${pos.side} — PnL: $${pnl.toFixed(2)}`,
        });
      }

      // Update close order status
      await tx
        .update(orders)
        .set({
          filledQuantity: filledQty.toFixed(8),
          status: matchResult.orderStatus,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, closeOrder.id));

      return {
        position: {
          ...pos,
          quantity: remainingQty < 1e-8 ? "0" : remainingQty.toFixed(8),
          status: remainingQty < 1e-8 ? "closed" : "open",
        },
        pnl: pnl.toFixed(8),
        filledQuantity: filledQty.toFixed(8),
      };
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Close position failed";
    const isValidation =
      message.includes("not found") ||
      message.includes("already closed") ||
      message.includes("Unable to close");
    return NextResponse.json(
      { success: false, error: message },
      { status: isValidation ? 400 : 500 }
    );
  }
}
