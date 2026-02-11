import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { distributeFunding } from "@/lib/services/funding";
import type { FuturesPair } from "@/lib/trading/constants";

const fundingSchema = z.object({
  contract: z.enum(["XAU-PERP", "XAG-PERP"]),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contract } = fundingSchema.parse(body);

    const result = await distributeFunding(contract as FuturesPair);

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Funding distribution failed";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
