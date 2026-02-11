import { db } from "@/lib/db";
import { orders, trades, positions } from "@/lib/db/schema";
import { eq, and, or, sql, asc, desc } from "drizzle-orm";
import type { OrderBookSnapshot } from "@/lib/trading/types";

export async function getOrderBook(
  pair: string,
  depth: number = 20
): Promise<OrderBookSnapshot> {
  // Bids: buy orders, grouped by price, highest first
  const bids = await db
    .select({
      price: orders.price,
      quantity: sql<string>`SUM(${orders.quantity}::decimal - ${orders.filledQuantity}::decimal)`,
      orderCount: sql<number>`COUNT(*)::int`,
    })
    .from(orders)
    .where(
      and(
        eq(orders.pair, pair),
        eq(orders.side, "buy"),
        sql`${orders.status} IN ('open', 'partial')`,
        sql`${orders.price} IS NOT NULL`
      )
    )
    .groupBy(orders.price)
    .orderBy(desc(orders.price))
    .limit(depth);

  // Asks: sell orders, grouped by price, lowest first
  const asks = await db
    .select({
      price: orders.price,
      quantity: sql<string>`SUM(${orders.quantity}::decimal - ${orders.filledQuantity}::decimal)`,
      orderCount: sql<number>`COUNT(*)::int`,
    })
    .from(orders)
    .where(
      and(
        eq(orders.pair, pair),
        eq(orders.side, "sell"),
        sql`${orders.status} IN ('open', 'partial')`,
        sql`${orders.price} IS NOT NULL`
      )
    )
    .groupBy(orders.price)
    .orderBy(asc(orders.price))
    .limit(depth);

  return {
    pair,
    bids: bids.map((b) => ({
      price: b.price!,
      quantity: b.quantity,
      orderCount: b.orderCount,
    })),
    asks: asks.map((a) => ({
      price: a.price!,
      quantity: a.quantity,
      orderCount: a.orderCount,
    })),
    timestamp: new Date().toISOString(),
  };
}

export async function getRecentTrades(pair: string, limit: number = 50) {
  return db
    .select()
    .from(trades)
    .where(eq(trades.pair, pair))
    .orderBy(desc(trades.createdAt))
    .limit(limit);
}

export async function getUserOrders(
  userId: string,
  options?: { pair?: string; status?: string; limit?: number }
) {
  const conditions = [eq(orders.userId, userId)];
  if (options?.pair) conditions.push(eq(orders.pair, options.pair));
  if (options?.status) conditions.push(eq(orders.status, options.status));

  return db
    .select()
    .from(orders)
    .where(and(...conditions))
    .orderBy(desc(orders.createdAt))
    .limit(options?.limit ?? 50);
}

export async function getUserOpenOrders(userId: string, pair?: string) {
  const conditions = [
    eq(orders.userId, userId),
    sql`${orders.status} IN ('open', 'partial')`,
  ];
  if (pair) conditions.push(eq(orders.pair, pair));

  return db
    .select()
    .from(orders)
    .where(and(...conditions))
    .orderBy(desc(orders.createdAt));
}

export async function getUserPositions(userId: string, status: string = "open") {
  return db
    .select()
    .from(positions)
    .where(and(eq(positions.userId, userId), eq(positions.status, status)))
    .orderBy(desc(positions.createdAt));
}

export async function getOpenPositionForContract(
  userId: string,
  contract: string,
  side: string
) {
  const [pos] = await db
    .select()
    .from(positions)
    .where(
      and(
        eq(positions.userId, userId),
        eq(positions.contract, contract),
        eq(positions.side, side),
        eq(positions.status, "open")
      )
    )
    .limit(1);
  return pos ?? null;
}

export async function getUserTradeHistory(userId: string, limit: number = 50) {
  return db
    .select()
    .from(trades)
    .where(
      or(eq(trades.makerUserId, userId), eq(trades.takerUserId, userId))
    )
    .orderBy(desc(trades.createdAt))
    .limit(limit);
}

export async function getOpenInterest(contract: string) {
  const result = await db
    .select({
      side: positions.side,
      totalQuantity: sql<string>`SUM(${positions.quantity})`,
    })
    .from(positions)
    .where(
      and(eq(positions.contract, contract), eq(positions.status, "open"))
    )
    .groupBy(positions.side);

  const longEntry = result.find((r) => r.side === "long");
  const shortEntry = result.find((r) => r.side === "short");

  return {
    longQuantity: longEntry?.totalQuantity ?? "0",
    shortQuantity: shortEntry?.totalQuantity ?? "0",
  };
}
