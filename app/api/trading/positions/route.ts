import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getUserPositions } from "@/lib/db/queries/trading";

export const dynamic = "force-dynamic";
import { getMarkPrice } from "@/lib/services/prices";
import {
  calculateUnrealizedPnl,
  calculateMaintenanceMargin,
} from "@/lib/services/margin";
import { PAIRS } from "@/lib/trading/constants";
import type { FuturesPair } from "@/lib/trading/constants";
import { applyPendingFunding } from "@/lib/services/funding";

export async function GET() {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const openPositions = await getUserPositions(user.id, "open");

    // Apply pending funding and enrich with live PnL
    const enriched = await Promise.all(
      openPositions.map(async (pos) => {
        // Apply any pending funding
        await applyPendingFunding(pos.id);

        const contract = pos.contract as FuturesPair;
        const pairConfig = PAIRS[contract];
        const markData = await getMarkPrice(contract);

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

        const marginRatio =
          maintenanceMargin > 0
            ? (parseFloat(pos.margin) + unrealizedPnl) / maintenanceMargin
            : Infinity;

        return {
          ...pos,
          unrealizedPnl: unrealizedPnl.toFixed(8),
          markPrice: markData.markPrice,
          maintenanceMargin: maintenanceMargin.toFixed(8),
          marginRatio: marginRatio.toFixed(4),
        };
      })
    );

    return NextResponse.json({ success: true, positions: enriched });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to fetch positions" },
      { status: 500 }
    );
  }
}
