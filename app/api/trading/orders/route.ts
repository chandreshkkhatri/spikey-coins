import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getUserOrders } from "@/lib/db/queries/trading";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const pair = request.nextUrl.searchParams.get("pair") ?? undefined;
    const status = request.nextUrl.searchParams.get("status") ?? undefined;
    const limit = parseInt(
      request.nextUrl.searchParams.get("limit") ?? "50",
      10
    );

    const orders = await getUserOrders(user.id, { pair, status, limit });

    return NextResponse.json({ success: true, orders });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
