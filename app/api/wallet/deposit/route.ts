import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { wallets, transactions } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

const depositSchema = z.object({
  currency: z.enum(["USDT", "USDC"]),
  amount: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0 && num <= 5;
  }, "Amount must be between $0.01 and $5.00"),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { currency, amount } = depositSchema.parse(body);
    const depositAmount = parseFloat(amount);

    const result = await db.transaction(async (tx) => {
      // Lock wallet rows for this user to prevent concurrent balance updates
      const userWallets = await tx
        .select()
        .from(wallets)
        .where(eq(wallets.userId, user.id))
        .for("update");

      const usdtWallet = userWallets.find((w) => w.currency === "USDT");
      const usdcWallet = userWallets.find((w) => w.currency === "USDC");
      const targetWallet = currency === "USDT" ? usdtWallet : usdcWallet;

      if (!targetWallet) {
        throw new Error("Wallet not found");
      }

      // Eligibility: total balance < $1
      const totalBalance =
        parseFloat(usdtWallet?.balance ?? "0") +
        parseFloat(usdcWallet?.balance ?? "0");

      if (totalBalance >= 1) {
        throw new Error(
          `Deposits are only allowed when your total balance is below $1.00. Your current total balance is $${totalBalance.toFixed(2)}.`
        );
      }

      // Atomic balance update using SQL arithmetic on DECIMAL columns
      const [updated] = await tx
        .update(wallets)
        .set({
          balance: sql`${wallets.balance} + ${depositAmount.toFixed(8)}::decimal`,
          availableBalance: sql`${wallets.availableBalance} + ${depositAmount.toFixed(8)}::decimal`,
          updatedAt: new Date(),
        })
        .where(eq(wallets.id, targetWallet.id))
        .returning({ balance: wallets.balance });

      // Record transaction
      const [txRecord] = await tx
        .insert(transactions)
        .values({
          userId: user.id,
          walletId: targetWallet.id,
          type: "deposit",
          currency,
          amount: depositAmount.toFixed(8),
          balanceAfter: updated.balance,
          description: `Deposit ${depositAmount.toFixed(2)} ${currency}`,
        })
        .returning();

      return txRecord;
    });

    // Simulated blockchain confirmation delay (dev only)
    if (process.env.NODE_ENV !== "production") {
      await new Promise((r) => setTimeout(r, 2000));
    }

    return NextResponse.json({ success: true, transaction: result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Deposit failed";
    const isValidation =
      message.includes("Deposits are only allowed") ||
      message.includes("Wallet not found");
    return NextResponse.json(
      { success: false, error: message },
      { status: isValidation ? 400 : 500 }
    );
  }
}
