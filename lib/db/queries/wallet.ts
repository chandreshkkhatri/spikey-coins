import { db } from "@/lib/db";
import { wallets, transactions } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function getUserWallets(userId: string) {
  const userWallets = await db
    .select()
    .from(wallets)
    .where(eq(wallets.userId, userId));

  return {
    usdt: userWallets.find((w) => w.currency === "USDT") ?? null,
    usdc: userWallets.find((w) => w.currency === "USDC") ?? null,
  };
}

export function getTotalBalance(
  usdtBalance: string | null,
  usdcBalance: string | null
): number {
  return parseFloat(usdtBalance ?? "0") + parseFloat(usdcBalance ?? "0");
}

export async function getRecentTransactions(
  userId: string,
  limit: number = 10
) {
  return db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.createdAt))
    .limit(limit);
}
