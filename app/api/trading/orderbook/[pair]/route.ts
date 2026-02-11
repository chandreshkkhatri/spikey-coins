import { NextRequest, NextResponse } from "next/server";
import { getOrderBook } from "@/lib/db/queries/trading";

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

    const depth = parseInt(
      request.nextUrl.searchParams.get("depth") ?? "20",
      10
    );
    const orderBook = await getOrderBook(pair, Math.min(depth, 50));

    return NextResponse.json({ success: true, ...orderBook });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to fetch order book" },
      { status: 500 }
    );
  }
}
