import { db } from "@/lib/db";
import { positions, wallets, transactions } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { PAIRS, FUNDING_RATE_CLAMP } from "@/lib/trading/constants";
import { getMarkPrice } from "./prices";
import { calculateNotional } from "./margin";
import type { FuturesPair } from "@/lib/trading/constants";

export function calculateFundingRate(
  futuresMidPrice: string | null,
  indexPrice: string
): number {
  if (!futuresMidPrice) return 0;
  const mid = parseFloat(futuresMidPrice);
  const idx = parseFloat(indexPrice);
  if (idx === 0) return 0;
  const rate = (mid - idx) / idx;
  return Math.max(-FUNDING_RATE_CLAMP, Math.min(FUNDING_RATE_CLAMP, rate));
}

export function getNextFundingTime(): Date {
  const now = new Date();
  const utcHours = now.getUTCHours();
  const intervals = [0, 8, 16, 24];
  const nextHour = intervals.find((h) => h > utcHours) ?? 24;
  const next = new Date(now);
  next.setUTCHours(nextHour === 24 ? 0 : nextHour, 0, 0, 0);
  if (nextHour === 24) next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

function getLastFundingTime(): Date {
  const now = new Date();
  const utcHours = now.getUTCHours();
  const intervals = [0, 8, 16];
  // Find the most recent interval that's <= current hour
  const lastInterval = [...intervals].reverse().find((h) => h <= utcHours) ?? 16;
  const last = new Date(now);
  last.setUTCHours(lastInterval, 0, 0, 0);
  if (lastInterval > utcHours) {
    last.setUTCDate(last.getUTCDate() - 1);
  }
  return last;
}

/**
 * Apply pending funding to a single position (on-demand).
 * Called when viewing positions or on order fill.
 */
export async function applyPendingFunding(
  positionId: string
): Promise<void> {
  await db.transaction(async (tx) => {
    const [pos] = await tx
      .select()
      .from(positions)
      .where(and(eq(positions.id, positionId), eq(positions.status, "open")))
      .for("update");

    if (!pos) return;

    const lastFunding = getLastFundingTime();

    // Skip if already funded for this interval
    if (pos.lastFundingAt && pos.lastFundingAt >= lastFunding) return;

    const contract = pos.contract as FuturesPair;
    const pairConfig = PAIRS[contract];
    const markData = await getMarkPrice(contract);
    const fundingRate = parseFloat(markData.fundingRate);

    if (fundingRate === 0) {
      // Update timestamp even if rate is 0
      await tx
        .update(positions)
        .set({ lastFundingAt: lastFunding, updatedAt: new Date() })
        .where(eq(positions.id, pos.id));
      return;
    }

    const notional = calculateNotional(
      pos.quantity,
      pairConfig.contractSize,
      markData.markPrice
    );
    // Positive rate: longs pay, shorts receive. Negative: vice versa.
    const payment = notional * fundingRate;
    const isDebit =
      (pos.side === "long" && fundingRate > 0) ||
      (pos.side === "short" && fundingRate < 0);

    const amount = isDebit ? -Math.abs(payment) : Math.abs(payment);
    const amountStr = amount.toFixed(8);

    // Get the user's collateral wallet
    const [wallet] = await tx
      .select()
      .from(wallets)
      .where(
        and(
          eq(wallets.userId, pos.userId),
          eq(wallets.currency, pos.collateralCurrency)
        )
      )
      .for("update");

    if (!wallet) return;

    // Update wallet balance
    await tx
      .update(wallets)
      .set({
        balance: sql`${wallets.balance} + ${amountStr}::decimal`,
        availableBalance: sql`${wallets.availableBalance} + ${amountStr}::decimal`,
        updatedAt: new Date(),
      })
      .where(eq(wallets.id, wallet.id));

    // Read back updated balance for transaction record
    const [updated] = await tx
      .select({ balance: wallets.balance })
      .from(wallets)
      .where(eq(wallets.id, wallet.id));

    // Record funding transaction
    await tx.insert(transactions).values({
      userId: pos.userId,
      walletId: wallet.id,
      type: "funding",
      currency: pos.collateralCurrency,
      amount: amountStr,
      balanceAfter: updated.balance,
      referenceId: pos.id,
      referenceType: "position",
      description: `Funding ${isDebit ? "payment" : "receipt"} for ${pos.contract} ${pos.side}`,
    });

    // Update position
    await tx
      .update(positions)
      .set({ lastFundingAt: lastFunding, updatedAt: new Date() })
      .where(eq(positions.id, pos.id));
  });
}

/**
 * Distribute funding to all open positions for a contract.
 * Called by the /api/trading/funding endpoint (cron/manual).
 */
export async function distributeFunding(
  contract: FuturesPair
): Promise<{ processedCount: number; fundingRate: string }> {
  const markData = await getMarkPrice(contract);
  const fundingRate = parseFloat(markData.fundingRate);

  if (fundingRate === 0) {
    return { processedCount: 0, fundingRate: "0" };
  }

  const lastFunding = getLastFundingTime();

  // Find all positions that haven't been funded for this interval
  const openPositions = await db
    .select()
    .from(positions)
    .where(
      and(
        eq(positions.contract, contract),
        eq(positions.status, "open"),
        sql`(${positions.lastFundingAt} IS NULL OR ${positions.lastFundingAt} < ${lastFunding})`
      )
    );

  let processedCount = 0;
  for (const pos of openPositions) {
    await applyPendingFunding(pos.id);
    processedCount++;
  }

  return { processedCount, fundingRate: fundingRate.toFixed(8) };
}
