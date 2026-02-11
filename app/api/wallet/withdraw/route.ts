import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { wallets, transactions } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

const WITHDRAWAL_FEE = 0.1;

const withdrawSchema = z.object({
  currency: z.enum(["USDT", "USDC"]),
  amount: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, "Amount must be greater than $0"),
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
    const { currency, amount } = withdrawSchema.parse(body);
    const withdrawAmount = parseFloat(amount);

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

      // Eligibility: total balance >= $10
      const totalBalance =
        parseFloat(usdtWallet?.balance ?? "0") +
        parseFloat(usdcWallet?.balance ?? "0");

      if (totalBalance < 10) {
        throw new Error(
          `Withdrawals require a total balance of at least $10.00. Your current total balance is $${totalBalance.toFixed(2)}.`
        );
      }

      // Check sufficient balance for amount + fee
      const totalDebit = withdrawAmount + WITHDRAWAL_FEE;
      const availableBalance = parseFloat(targetWallet.availableBalance);

      if (totalDebit > availableBalance) {
        throw new Error(
          `Insufficient ${currency} balance. You need $${totalDebit.toFixed(2)} ($${withdrawAmount.toFixed(2)} + $${WITHDRAWAL_FEE.toFixed(2)} fee) but only have $${availableBalance.toFixed(2)} available.`
        );
      }

      // Atomic balance update using SQL arithmetic on DECIMAL columns
      const totalDebitStr = totalDebit.toFixed(8);
      const [updated] = await tx
        .update(wallets)
        .set({
          balance: sql`${wallets.balance} - ${totalDebitStr}::decimal`,
          availableBalance: sql`${wallets.availableBalance} - ${totalDebitStr}::decimal`,
          updatedAt: new Date(),
        })
        .where(eq(wallets.id, targetWallet.id))
        .returning({ balance: wallets.balance });

      // Compute intermediate balance for the withdrawal ledger entry
      // (balance after withdrawal amount, before fee)
      const balanceAfterWithdrawal = (
        parseFloat(updated.balance) + WITHDRAWAL_FEE
      ).toFixed(8);

      // Record withdrawal transaction
      const [withdrawalTx] = await tx
        .insert(transactions)
        .values({
          userId: user.id,
          walletId: targetWallet.id,
          type: "withdrawal",
          currency,
          amount: (-withdrawAmount).toFixed(8),
          balanceAfter: balanceAfterWithdrawal,
          description: `Withdrawal ${withdrawAmount.toFixed(2)} ${currency}`,
        })
        .returning();

      // Record fee transaction (balanceAfter = final wallet balance)
      await tx.insert(transactions).values({
        userId: user.id,
        walletId: targetWallet.id,
        type: "withdrawal_fee",
        currency,
        amount: (-WITHDRAWAL_FEE).toFixed(8),
        balanceAfter: updated.balance,
        referenceId: withdrawalTx.id,
        referenceType: "withdrawal",
        description: "Withdrawal fee",
      });

      return {
        ...withdrawalTx,
        fee: WITHDRAWAL_FEE.toFixed(2),
        netAmount: withdrawAmount.toFixed(2),
      };
    });

    // Simulated blockchain processing delay (dev only)
    if (process.env.NODE_ENV !== "production") {
      await new Promise((r) => setTimeout(r, 2000));
    }

    return NextResponse.json({ success: true, transaction: result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Withdrawal failed";
    const isValidation =
      message.includes("Withdrawals require") ||
      message.includes("Insufficient") ||
      message.includes("Wallet not found");
    return NextResponse.json(
      { success: false, error: message },
      { status: isValidation ? 400 : 500 }
    );
  }
}
