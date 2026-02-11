import { NextResponse } from "next/server";
import { getIndexPrices, getMarkPrice, getOrderBookMidPrice } from "@/lib/services/prices";

export async function GET() {
  try {
    const indexPrices = await getIndexPrices();
    const [xauMark, xagMark] = await Promise.all([
      getMarkPrice("XAU-PERP"),
      getMarkPrice("XAG-PERP"),
    ]);
    const usdtUsdcMid = await getOrderBookMidPrice("USDT-USDC");

    return NextResponse.json({
      success: true,
      gold: xauMark,
      silver: xagMark,
      usdtUsdc: {
        midPrice: usdtUsdcMid ?? "1.00000000",
      },
      fetchedAt: indexPrices.timestamp,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to fetch prices" },
      { status: 500 }
    );
  }
}
