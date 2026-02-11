import { NextRequest, NextResponse } from "next/server";
import { getRecentTrades } from "@/lib/db/queries/trading";

const VALID_PAIRS = ["USDT-USDC", "XAU-PERP", "XAG-PERP"];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pair: string }> }
) {
  try {
    const { pair } = await params;

    if (!VALID_PAIRS.includes(pair)) {
      return NextResponse.json(
        { success: false, error: `Invalid pair: ${pair}` },
        { status: 400 }
      );
    }

    const limit = parseInt(
      request.nextUrl.searchParams.get("limit") ?? "50",
      10
    );
    const trades = await getRecentTrades(pair, Math.min(limit, 100));

    return NextResponse.json({ success: true, trades });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to fetch trades" },
      { status: 500 }
    );
  }
}
