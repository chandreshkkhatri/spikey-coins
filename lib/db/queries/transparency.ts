import { db } from "@/lib/db";
import { users, trades, transactions, orders } from "@/lib/db/schema";
import { eq, and, sql, gte, desc } from "drizzle-orm";

export async function getTotalUserCount(): Promise<number> {
  const [result] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(users);
  return result.count;
}

export async function getTradingVolume(
  pair?: string,
  since?: Date
): Promise<string> {
  const conditions = [];
  if (pair) conditions.push(eq(trades.pair, pair));
  if (since) conditions.push(gte(trades.createdAt, since));

  const [result] = await db
    .select({
      volume: sql<string>`COALESCE(SUM(${trades.price}::decimal * ${trades.quantity}::decimal), 0)::text`,
    })
    .from(trades)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  return result.volume;
}

export async function getTotalFeeRevenue(): Promise<string> {
  const [result] = await db
    .select({
      totalFees: sql<string>`COALESCE(SUM(${trades.makerFee}::decimal + ${trades.takerFee}::decimal), 0)::text`,
    })
    .from(trades);
  return result.totalFees;
}

export async function getWithdrawalFeeRevenue(): Promise<string> {
  const [result] = await db
    .select({
      totalFees: sql<string>`COALESCE(SUM(ABS(${transactions.amount}::decimal)), 0)::text`,
    })
    .from(transactions)
    .where(eq(transactions.type, "withdrawal_fee"));
  return result.totalFees;
}

export async function getOrderBookDepth(pair: string) {
  const [bidDepth] = await db
    .select({
      totalVolume: sql<string>`COALESCE(SUM(${orders.quantity}::decimal - ${orders.filledQuantity}::decimal), 0)::text`,
      orderCount: sql<number>`COUNT(*)::int`,
      bestPrice: sql<string>`MAX(${orders.price})`,
    })
    .from(orders)
    .where(
      and(
        eq(orders.pair, pair),
        eq(orders.side, "buy"),
        sql`${orders.status} IN ('open', 'partial')`,
        sql`${orders.price} IS NOT NULL`
      )
    );

  const [askDepth] = await db
    .select({
      totalVolume: sql<string>`COALESCE(SUM(${orders.quantity}::decimal - ${orders.filledQuantity}::decimal), 0)::text`,
      orderCount: sql<number>`COUNT(*)::int`,
      bestPrice: sql<string>`MIN(${orders.price})`,
    })
    .from(orders)
    .where(
      and(
        eq(orders.pair, pair),
        eq(orders.side, "sell"),
        sql`${orders.status} IN ('open', 'partial')`,
        sql`${orders.price} IS NOT NULL`
      )
    );

  const bestBid = bidDepth.bestPrice ? parseFloat(bidDepth.bestPrice) : null;
  const bestAsk = askDepth.bestPrice ? parseFloat(askDepth.bestPrice) : null;
  const spread =
    bestBid !== null && bestAsk !== null
      ? (bestAsk - bestBid).toFixed(8)
      : null;

  return {
    bids: {
      totalVolume: bidDepth.totalVolume,
      orderCount: bidDepth.orderCount,
      bestPrice: bidDepth.bestPrice,
    },
    asks: {
      totalVolume: askDepth.totalVolume,
      orderCount: askDepth.orderCount,
      bestPrice: askDepth.bestPrice,
    },
    spread,
  };
}

export async function getRecentTradesAnonymized(
  pair: string,
  limit: number = 20
) {
  return db
    .select({
      id: trades.id,
      pair: trades.pair,
      price: trades.price,
      quantity: trades.quantity,
      createdAt: trades.createdAt,
    })
    .from(trades)
    .where(eq(trades.pair, pair))
    .orderBy(desc(trades.createdAt))
    .limit(limit);
}

export async function getTradeCount(pair?: string): Promise<number> {
  const conditions = pair ? [eq(trades.pair, pair)] : [];
  const [result] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(trades)
    .where(conditions.length > 0 ? and(...conditions) : undefined);
  return result.count;
}
