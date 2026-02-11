import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { eq, and, sql, asc, desc } from "drizzle-orm";
import {
  FALLBACK_PRICES,
  MARK_PRICE_INDEX_WEIGHT,
  MARK_PRICE_BOOK_WEIGHT,

  FUNDING_RATE_CLAMP,
} from "@/lib/trading/constants";
import type { PriceData, MarkPriceData } from "@/lib/trading/types";

// In-memory cache (resets on server restart — fine for academic use)
let priceCache: { data: PriceData; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

export async function getIndexPrices(): Promise<PriceData> {
  // Return cached data if fresh
  if (priceCache && Date.now() - priceCache.fetchedAt < CACHE_TTL_MS) {
    return priceCache.data;
  }

  const apiKey = process.env.METALS_DEV_API_KEY;
  if (!apiKey) {
    console.warn("METALS_DEV_API_KEY not set, using fallback prices");
    return {
      gold: FALLBACK_PRICES.gold,
      silver: FALLBACK_PRICES.silver,
      timestamp: new Date().toISOString(),
    };
  }

  try {
    const res = await fetch(
      `https://api.metals.dev/v1/latest?api_key=${apiKey}&currency=USD&unit=toz`,
      { next: { revalidate: 1800 } } // Next.js fetch cache: 30 minutes
    );

    if (!res.ok) {
      throw new Error(`Metals API returned ${res.status}`);
    }

    const json = await res.json();
    const data: PriceData = {
      gold: json.metals.gold,
      silver: json.metals.silver,
      timestamp: json.timestamp,
    };

    priceCache = { data, fetchedAt: Date.now() };
    return data;
  } catch (error) {
    console.error("Failed to fetch metal prices:", error);
    // Return cached data even if stale, or fallback
    if (priceCache) return priceCache.data;
    return {
      gold: FALLBACK_PRICES.gold,
      silver: FALLBACK_PRICES.silver,
      timestamp: new Date().toISOString(),
    };
  }
}

export async function getOrderBookMidPrice(
  pair: string
): Promise<string | null> {
  // Best bid: highest buy price
  const [bestBid] = await db
    .select({ price: orders.price })
    .from(orders)
    .where(
      and(
        eq(orders.pair, pair),
        eq(orders.side, "buy"),
        sql`${orders.status} IN ('open', 'partial')`,
        sql`${orders.price} IS NOT NULL`
      )
    )
    .orderBy(desc(orders.price))
    .limit(1);

  // Best ask: lowest sell price
  const [bestAsk] = await db
    .select({ price: orders.price })
    .from(orders)
    .where(
      and(
        eq(orders.pair, pair),
        eq(orders.side, "sell"),
        sql`${orders.status} IN ('open', 'partial')`,
        sql`${orders.price} IS NOT NULL`
      )
    )
    .orderBy(asc(orders.price))
    .limit(1);

  if (!bestBid?.price || !bestAsk?.price) return null;

  const mid = (parseFloat(bestBid.price) + parseFloat(bestAsk.price)) / 2;
  return mid.toFixed(8);
}

export async function getMarkPrice(
  pair: "XAU-PERP" | "XAG-PERP"
): Promise<MarkPriceData> {
  const prices = await getIndexPrices();
  const indexPrice = pair === "XAU-PERP" ? prices.gold : prices.silver;
  const orderBookMid = await getOrderBookMidPrice(pair);

  let markPrice: number;
  if (orderBookMid) {
    markPrice =
      indexPrice * MARK_PRICE_INDEX_WEIGHT +
      parseFloat(orderBookMid) * MARK_PRICE_BOOK_WEIGHT;
  } else {
    markPrice = indexPrice;
  }

  // Calculate current funding rate
  const futuresMid = orderBookMid ? parseFloat(orderBookMid) : null;
  let fundingRate = 0;
  if (futuresMid !== null && indexPrice > 0) {
    fundingRate = (futuresMid - indexPrice) / indexPrice;
    fundingRate = Math.max(-FUNDING_RATE_CLAMP, Math.min(FUNDING_RATE_CLAMP, fundingRate));
  }

  return {
    indexPrice: indexPrice.toFixed(8),
    markPrice: markPrice.toFixed(8),
    orderBookMid,
    fundingRate: fundingRate.toFixed(8),
    nextFundingAt: getNextFundingTime().toISOString(),
  };
}

export function getNextFundingTime(): Date {
  const now = new Date();
  const utcHours = now.getUTCHours();
  // Funding at 00:00, 08:00, 16:00 UTC
  const intervals = [0, 8, 16, 24];
  const nextHour = intervals.find((h) => h > utcHours) ?? 24;

  const next = new Date(now);
  next.setUTCHours(nextHour === 24 ? 0 : nextHour, 0, 0, 0);
  if (nextHour === 24) next.setUTCDate(next.getUTCDate() + 1);
  return next;
}
