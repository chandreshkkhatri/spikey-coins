import { getSession } from "@/lib/auth/session";
import {
  getUserWallets,
  getTotalBalance,
  getRecentTransactions,
} from "@/lib/db/queries/wallet";
import Link from "next/link";

export default async function Dashboard() {
  const user = await getSession();
  if (!user) return null;

  const { usdt, usdc } = await getUserWallets(user.id);
  const totalBalance = getTotalBalance(
    usdt?.balance ?? null,
    usdc?.balance ?? null
  );
  const recentTxns = await getRecentTransactions(user.id, 5);

  const canDeposit = totalBalance < 1;
  const canWithdraw = totalBalance >= 10;

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-2 text-2xl font-bold text-white">Dashboard</h1>
      <p className="mb-8 text-zinc-400">
        Welcome back. Here&apos;s your account overview.
      </p>

      {/* Total Balance Hero */}
      <div className="mb-8 rounded-2xl border border-gold/20 bg-surface p-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">
          Total Account Value
        </p>
        <p className="mt-2 font-mono text-4xl font-bold text-white">
          ${totalBalance.toFixed(2)}
        </p>
        <p className="mt-1 text-sm text-zinc-500">USD equivalent</p>
      </div>

      {/* Wallet Balances */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-gold">
            USDT
          </h2>
          <p className="font-mono text-2xl text-white">
            ${parseFloat(usdt?.balance ?? "0").toFixed(2)}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Available: $
            {parseFloat(usdt?.availableBalance ?? "0").toFixed(2)}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-silver">
            USDC
          </h2>
          <p className="font-mono text-2xl text-white">
            ${parseFloat(usdc?.balance ?? "0").toFixed(2)}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Available: $
            {parseFloat(usdc?.availableBalance ?? "0").toFixed(2)}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Link
          href="/exchange/deposit"
          className="rounded-2xl border border-border bg-surface p-4 text-center transition-colors hover:border-gold/30"
        >
          <p className="text-sm font-semibold text-gold">Deposit</p>
          <p className="mt-1 text-xs text-zinc-500">
            {canDeposit ? "Add funds to your account" : "Balance must be < $1"}
          </p>
        </Link>
        <Link
          href="/exchange/withdraw"
          className="rounded-2xl border border-border bg-surface p-4 text-center transition-colors hover:border-gold/30"
        >
          <p className="text-sm font-semibold text-gold">Withdraw</p>
          <p className="mt-1 text-xs text-zinc-500">
            {canWithdraw
              ? "Withdraw available funds"
              : "Need $10+ to withdraw"}
          </p>
        </Link>
        <Link
          href="/exchange/trade/gold"
          className="rounded-2xl border border-border bg-surface p-4 text-center transition-colors hover:border-gold/30"
        >
          <p className="text-sm font-semibold text-gold">Trade</p>
          <p className="mt-1 text-xs text-zinc-500">Gold & silver futures</p>
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="rounded-2xl border border-border bg-surface p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">
            Recent Activity
          </h2>
          <Link
            href="/exchange/wallet"
            className="text-xs text-zinc-500 transition-colors hover:text-gold"
          >
            View all &rarr;
          </Link>
        </div>
        {recentTxns.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No activity yet. Make your first deposit to get started.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-xs text-zinc-500">
                  <th className="pb-2">Type</th>
                  <th className="pb-2">Amount</th>
                  <th className="pb-2">Currency</th>
                  <th className="pb-2 text-right">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentTxns.map((tx) => (
                  <tr key={tx.id} className="border-b border-border/50">
                    <td className="py-3 text-sm capitalize text-zinc-300">
                      {tx.type.replace("_", " ")}
                    </td>
                    <td
                      className={`py-3 font-mono text-sm ${
                        parseFloat(tx.amount) >= 0
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {parseFloat(tx.amount) >= 0 ? "+" : ""}
                      {parseFloat(tx.amount).toFixed(2)}
                    </td>
                    <td className="py-3 text-sm text-zinc-400">
                      {tx.currency}
                    </td>
                    <td className="py-3 text-right text-sm text-zinc-500">
                      {tx.createdAt.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
