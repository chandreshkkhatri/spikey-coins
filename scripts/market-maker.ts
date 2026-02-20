#!/usr/bin/env npx tsx
/**
 * Open Mandi — Market Maker Bot
 *
 * Mirrors Binance gold/silver prices into the local order book,
 * placing 5 levels per side with increasing spread and size.
 *
 * Usage:
 *   npx tsx scripts/market-maker.ts                # default tag "local"
 *   npx tsx scripts/market-maker.ts --tag=aws-1    # custom tag for multi-instance
 *
 * Env:
 *   POSTGRES_URL  — Neon / Postgres connection string (required)
 */

import { config } from "dotenv";
config({ path: ".env.local" });
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import {
    pgTable,
    uuid,
    text,
    timestamp,
    decimal,
    unique,
} from "drizzle-orm/pg-core";
import { eq, and, like } from "drizzle-orm";

import { matchOrder, settleSpotTrade, settleFuturesTrade } from "../lib/services/matching";
import { calculateInitialMargin } from "../lib/services/margin";
import { trades as tradesTable } from "../lib/db/schema";
import type { PairKey, FuturesPair } from "../lib/trading/constants";
import { sql } from "drizzle-orm";

// ─── Env check ───────────────────────────────────────────────────────────────
if (!process.env.POSTGRES_URL) {
    console.error("❌  POSTGRES_URL is not set. Add it to .env or .env.local");
    process.exit(1);
}

// ─── CLI args ────────────────────────────────────────────────────────────────
const TAG =
    process.argv.find((a) => a.startsWith("--tag="))?.split("=")[1] ?? "local";

// ─── Inline schema (no @/ imports — portable) ───────────────────────────────
const users = pgTable("users", {
    id: uuid("id").primaryKey().defaultRandom(),
    firebaseUid: text("firebase_uid").unique().notNull(),
    email: text("email").unique().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

const wallets = pgTable(
    "wallets",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        userId: uuid("user_id")
            .references(() => users.id)
            .notNull(),
        currency: text("currency").notNull(),
        balance: decimal("balance", { precision: 18, scale: 8 })
            .default("0")
            .notNull(),
        availableBalance: decimal("available_balance", { precision: 18, scale: 8 })
            .default("0")
            .notNull(),
        updatedAt: timestamp("updated_at").defaultNow().notNull(),
    },
    (table) => [unique("wallets_user_currency").on(table.userId, table.currency)]
);

const orders = pgTable("orders", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
        .references(() => users.id)
        .notNull(),
    pair: text("pair").notNull(),
    side: text("side").notNull(),
    type: text("type").notNull(),
    price: decimal("price", { precision: 18, scale: 8 }),
    quantity: decimal("quantity", { precision: 18, scale: 8 }).notNull(),
    filledQuantity: decimal("filled_quantity", { precision: 18, scale: 8 })
        .default("0")
        .notNull(),
    status: text("status").default("open").notNull(),
    collateralCurrency: text("collateral_currency"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── DB connection ───────────────────────────────────────────────────────────
neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.POSTGRES_URL });
const db = drizzle({ client: pool });

// ─── Configuration ───────────────────────────────────────────────────────────
const REFRESH_INTERVAL_MS = 5_000; // 5 seconds

// Spread levels: [spreadPercent, qtyMultiplier]
const LEVELS: [number, number][] = [
    [0.0005, 1], // 0.05%  — 1x
    [0.0010, 2], // 0.10%  — 2x
    [0.0020, 3], // 0.20%  — 3x
    [0.0040, 5], // 0.40%  — 5x
    [0.0080, 8], // 0.80%  — 8x
];

const BASE_QTY_XAU = 10; // contracts (~$27 notional)
const BASE_QTY_XAG = 10; // contracts (~$32 notional)
const BASE_QTY_USDT = 30; // base (~$30 notional)
const LEVERAGE = 10;

const PAIR_CONFIG = {
    "XAU-PERP": { binanceSymbol: "XAUUSDT", type: "futures", contracts: "0.001", spread: 0.0005, priceDec: 2, takerFeeRate: "0.0005" },
    "XAG-PERP": { binanceSymbol: "XAGUSDT", type: "futures", contracts: "0.1", spread: 0.001, priceDec: 3, takerFeeRate: "0.0005" },
    "USDT-USDC": { binanceSymbol: "USDCUSDT", type: "spot", contracts: "1", spread: 0.0002, priceDec: 4, takerFeeRate: "0.001" },
} as const;

const SYSTEM_EMAIL = `system_mm_${TAG}@openmandi.com`;

// ─── Binance API ─────────────────────────────────────────────────────────────
const BINANCE_FUTURES_BOOK_TICKER_API = "https://fapi.binance.com/fapi/v1/ticker/bookTicker";
const BINANCE_SPOT_PRICE_API = "https://api.binance.com/api/v3/ticker/price";

async function getBinancePrice(symbol: string) {
    if (symbol === "USDCUSDT") {
        // For stablecoin pair, use a fixed price or fetch from spot
        try {
            const res = await fetch(`${BINANCE_SPOT_PRICE_API}?symbol=${symbol}`);
            if (!res.ok) throw new Error(`Binance Spot ${res.status}`);
            const data = await res.json();
            const price = parseFloat(data.price);
            return { bid: price, ask: price, mid: price };
        } catch (err) {
            console.error(`  ⚠  Failed to fetch spot price for ${symbol}:`, (err as Error).message);
            // Fallback to fixed 1.00 if spot fetch fails
            return { bid: 1.00, ask: 1.00, mid: 1.00 };
        }
    }

    try {
        const res = await fetch(`${BINANCE_FUTURES_BOOK_TICKER_API}?symbol=${symbol}`);
        if (!res.ok) throw new Error(`Binance Futures ${res.status}`);
        const data = await res.json();
        return {
            bid: parseFloat(data.bidPrice),
            ask: parseFloat(data.askPrice),
            mid: (parseFloat(data.bidPrice) + parseFloat(data.askPrice)) / 2,
        };
    } catch (err) {
        console.error(`  ⚠  Failed to fetch futures price for ${symbol}:`, (err as Error).message);
        return null;
    }
}

// ─── System user bootstrap ───────────────────────────────────────────────────
async function ensureSystemUser() {
    let [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, SYSTEM_EMAIL));

    if (!user) {
        console.log(`  Creating system user: ${SYSTEM_EMAIL}`);
        [user] = await db
            .insert(users)
            .values({
                email: SYSTEM_EMAIL,
                firebaseUid: `system_mm_${TAG}_${Date.now()}`,
            })
            .returning();

        await db.insert(wallets).values([
            {
                userId: user.id,
                currency: "USDT",
                balance: "100",
                availableBalance: "100",
            },
            {
                userId: user.id,
                currency: "USDC",
                balance: "100",
                availableBalance: "100",
            },
        ]);
    }

    return user;
}

// ─── Core loop ───────────────────────────────────────────────────────────────

async function placeMMLimitOrder(
  userId: string,
  pair: PairKey,
  side: "buy" | "sell",
  price: string,
  quantity: string
): Promise<boolean> {
  const config = PAIR_CONFIG[pair as keyof typeof PAIR_CONFIG];
  
  try {
    await db.transaction(async (tx) => {
      // 1. Lock wallet balance
      const userWallets = await tx
        .select()
        .from(wallets)
        .where(eq(wallets.userId, userId))
        .for("update");

      if (config.type === "spot") {
        const needed = side === "sell" 
          ? parseFloat(quantity) 
          : parseFloat(quantity) * parseFloat(price);
        const currency = side === "sell" ? "USDT" : "USDC"; // base is USDT, quote is USDC
        
        const wallet = userWallets.find((w) => w.currency === currency);
        if (!wallet || parseFloat(wallet.availableBalance) < needed) {
          throw new Error("SKIP: insufficient balance");
        }
        await tx
          .update(wallets)
          .set({
            availableBalance: sql`${wallets.availableBalance} - ${needed.toFixed(8)}::decimal`,
            updatedAt: new Date(),
          })
          .where(eq(wallets.id, wallet.id));
      } else {
        const margin = calculateInitialMargin(
          quantity,
          config.contracts.toString(),
          price,
          LEVERAGE
        );
        const estFee = margin * LEVERAGE * parseFloat(config.takerFeeRate);
        const needed = margin + estFee;
        const wallet = userWallets.find((w) => w.currency === "USDT");
        
        if (!wallet || parseFloat(wallet.availableBalance) < needed) {
          throw new Error("SKIP: insufficient balance");
        }
        await tx
          .update(wallets)
          .set({
            availableBalance: sql`${wallets.availableBalance} - ${needed.toFixed(8)}::decimal`,
            updatedAt: new Date(),
          })
          .where(eq(wallets.id, wallet.id));
      }

      // 2. Insert order
      const [order] = await tx
        .insert(orders)
        .values({
          userId,
          pair,
          side,
          type: "limit",
          price,
          quantity,
          status: "open",
          collateralCurrency: config.type === "futures" ? "USDT" : null,
        })
        .returning();

      // 3. Match Order
      const matchResult = await matchOrder(tx as any, {
        id: order.id,
        userId,
        pair,
        side,
        type: "limit",
        price,
        quantity,
      });

      // 4. Settle Fills
      for (const fill of matchResult.fills) {
        await tx.insert(tradesTable as any).values({
          pair,
          makerOrderId: fill.makerOrderId,
          takerOrderId: order.id,
          makerUserId: fill.makerUserId,
          takerUserId: userId,
          price: fill.price,
          quantity: fill.quantity,
          makerFee: fill.makerFee,
          takerFee: fill.takerFee,
        } as any);

        if (config.type === "spot") {
          await settleSpotTrade(tx as any, fill, {
            id: order.id,
            userId,
            side,
          });
        } else {
          await settleFuturesTrade(
            tx as any,
            fill,
            {
              id: order.id,
              userId,
              side,
              collateralCurrency: "USDT",
              leverage: LEVERAGE,
            },
            pair as FuturesPair
          );
        }
      }

      // 5. Update Order Status
      const filledQty = parseFloat(quantity) - parseFloat(matchResult.remainingQuantity);
      await tx
        .update(orders)
        .set({
          filledQuantity: filledQty.toFixed(8),
          status: matchResult.orderStatus,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, order.id));
    });
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.startsWith("SKIP:")) return false; 
    console.error(`Error matching order for ${pair}:`, err);
    return false;
  }
}

async function releaseCancelledFunds(tx: any, order: any, pairConfig: any) {
  const remainingQty = parseFloat(order.quantity) - parseFloat(order.filledQuantity);
  if (remainingQty <= 0) return;

  if (pairConfig.type === "spot") {
    const lockedCurrency = order.side === "sell" ? "USDT" : "USDC";
    const releaseAmount = order.side === "sell" ? remainingQty : remainingQty * parseFloat(order.price ?? "0");

    if (releaseAmount > 0) {
      await tx.update(wallets)
        .set({ availableBalance: sql`${wallets.availableBalance} + ${releaseAmount.toFixed(8)}::decimal` })
        .where(and(eq(wallets.userId, order.userId), eq(wallets.currency, lockedCurrency)));
    }
  } else {
    const margin = calculateInitialMargin(remainingQty.toString(), pairConfig.contracts.toString(), order.price ?? "0", LEVERAGE);
    const estFee = margin * LEVERAGE * parseFloat(pairConfig.takerFeeRate);
    const releaseAmount = margin + estFee;

    if (releaseAmount > 0) {
      await tx.update(wallets)
        .set({ availableBalance: sql`${wallets.availableBalance} + ${releaseAmount.toFixed(8)}::decimal` })
        .where(and(eq(wallets.userId, order.userId), eq(wallets.currency, "USDT")));
    }
  }
}

async function tick(userId: string) {
    const ts = new Date().toISOString().slice(11, 19);
    process.stdout.write(`[${ts}] `);

    // 1. Fetch prices in parallel
    const [xau, xag] = await Promise.all([
        getBinancePrice("XAUUSDT"),
        getBinancePrice("XAGUSDT"),
    ]);

    if (!xau || !xag) {
        console.log("skipped (price fetch failed)");
        return;
    }

    // 2. Cancel open orders and release wallet funds safely
    await db.transaction(async (tx) => {
        const openOrders = await tx
            .select()
            .from(orders)
            .where(and(eq(orders.userId, userId), sql`${orders.status} IN ('open', 'partial')`))
            .for("update");

        for (const order of openOrders) {
            await tx
                .update(orders)
                .set({ status: "cancelled", updatedAt: new Date() })
                .where(eq(orders.id, order.id));
            
            const config = PAIR_CONFIG[order.pair as keyof typeof PAIR_CONFIG];
            if (config) {
               await releaseCancelledFunds(tx, order, config);
            }
        }
    });

    // 3. Place new orders level by level via matching engine
    let placed = 0;
    for (const [spread, qtyMul] of LEVELS) {
        const xauBid = (xau.mid * (1 - spread)).toFixed(2);
        const xauAsk = (xau.mid * (1 + spread)).toFixed(2);
        const xauQty = (BASE_QTY_XAU * qtyMul).toString();
        
        if (await placeMMLimitOrder(userId, "XAU-PERP", "buy", xauBid, xauQty)) placed++;
        if (await placeMMLimitOrder(userId, "XAU-PERP", "sell", xauAsk, xauQty)) placed++;

        const xagBid = (xag.mid * (1 - spread)).toFixed(3);
        const xagAsk = (xag.mid * (1 + spread)).toFixed(3);
        const xagQty = (BASE_QTY_XAG * qtyMul).toString();
        
        if (await placeMMLimitOrder(userId, "XAG-PERP", "buy", xagBid, xagQty)) placed++;
        if (await placeMMLimitOrder(userId, "XAG-PERP", "sell", xagAsk, xagQty)) placed++;

        const usdtBid = (1.0 * (1 - spread)).toFixed(4); // USDT-USDC always around $1.00
        const usdtAsk = (1.0 * (1 + spread)).toFixed(4);
        const usdtQty = (BASE_QTY_USDT * qtyMul).toString();
        
        if (await placeMMLimitOrder(userId, "USDT-USDC", "buy", usdtBid, usdtQty)) placed++;
        if (await placeMMLimitOrder(userId, "USDT-USDC", "sell", usdtAsk, usdtQty)) placed++;
    }

    console.log(
        `${placed} orders placed | XAU ${xau.mid.toFixed(2)} | XAG ${xag.mid.toFixed(3)}`
    );
}

// ─── Entry point ─────────────────────────────────────────────────────────────
async function main() {
    console.log(`\n🤖 Open Mandi Market Maker`);
    console.log(`   Tag:      ${TAG}`);
    console.log(`   User:     ${SYSTEM_EMAIL}`);
    console.log(`   Levels:   ${LEVELS.length} per side`);
    console.log(`   Interval: ${REFRESH_INTERVAL_MS / 1000}s\n`);

    const user = await ensureSystemUser();
    console.log(`   User ID:  ${user.id}\n`);

    // Initial tick
    await tick(user.id);

    // Loop
    setInterval(() => tick(user.id), REFRESH_INTERVAL_MS);
}

main().catch((err) => {
    console.error("Fatal:", err);
    process.exit(1);
});
