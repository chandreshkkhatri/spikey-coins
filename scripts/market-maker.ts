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

const BASE_QTY_XAU = 1; // contracts
const BASE_QTY_XAG = 1; // contracts

const PAIR_CONFIG = {
    "XAU-PERP": { binanceSymbol: "XAUUSDT", contracts: 10, spread: 0.0005, priceDec: 2 },
    "XAG-PERP": { binanceSymbol: "XAGUSDT", contracts: 100, spread: 0.001, priceDec: 3 },
    "USDT-USDC": { binanceSymbol: "USDCUSDT", contracts: 5000, spread: 0.0002, priceDec: 4 },
};

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
                balance: "1000000",
                availableBalance: "1000000",
            },
            {
                userId: user.id,
                currency: "USDC",
                balance: "1000000",
                availableBalance: "1000000",
            },
        ]);
    }

    return user;
}

// ─── Core loop ───────────────────────────────────────────────────────────────
function buildOrders(
    userId: string,
    pair: string,
    mid: number,
    baseQty: number,
    priceDec: number
) {
    const rows: (typeof orders.$inferInsert)[] = [];

    for (const [spread, qtyMul] of LEVELS) {
        const bidPrice = mid * (1 - spread);
        const askPrice = mid * (1 + spread);
        const qty = (baseQty * qtyMul).toString();

        rows.push({
            userId,
            pair,
            side: "buy",
            type: "limit",
            price: bidPrice.toFixed(priceDec),
            quantity: qty,
            status: "open",
            collateralCurrency: "USDT",
        });

        rows.push({
            userId,
            pair,
            side: "sell",
            type: "limit",
            price: askPrice.toFixed(priceDec),
            quantity: qty,
            status: "open",
            collateralCurrency: "USDT",
        });
    }

    return rows;
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

    // 2. Cancel our own open orders (only this tag's user)
    await db
        .update(orders)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(and(eq(orders.userId, userId), eq(orders.status, "open")));

    // 3. Build dense order book
    const newOrders = [
        ...buildOrders(userId, "XAU-PERP", xau.mid, BASE_QTY_XAU, 2),
        ...buildOrders(userId, "XAG-PERP", xag.mid, BASE_QTY_XAG, 3),
    ];

    // 4. Insert all at once
    await db.insert(orders).values(newOrders);

    console.log(
        `${newOrders.length} orders | XAU ${xau.mid.toFixed(2)} | XAG ${xag.mid.toFixed(3)}`
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
