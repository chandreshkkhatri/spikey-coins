"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const WITHDRAWAL_FEE = 0.1;

export default function WithdrawForm({
  usdtAvailable,
  usdcAvailable,
}: {
  usdtAvailable: number;
  usdcAvailable: number;
}) {
  const router = useRouter();
  const [currency, setCurrency] = useState<"USDT" | "USDC">("USDT");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const maxAmount = currency === "USDT" ? usdtAvailable : usdcAvailable;
  const maxWithdrawable = Math.max(0, maxAmount - WITHDRAWAL_FEE);
  const parsedAmount = parseFloat(amount);
  const isValid =
    !isNaN(parsedAmount) &&
    parsedAmount > 0 &&
    parsedAmount + WITHDRAWAL_FEE <= maxAmount;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch("/api/wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currency, amount }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Withdrawal failed");

      setSuccess(
        `Successfully withdrew $${parsedAmount.toFixed(2)} ${currency} (fee: $${WITHDRAWAL_FEE.toFixed(2)})`
      );
      setAmount("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Withdrawal failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-gold">
        Withdraw Funds
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm text-zinc-400">
            Currency
          </label>
          <div className="flex gap-2">
            {(["USDT", "USDC"] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setCurrency(c);
                  setAmount("");
                }}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                  currency === c
                    ? "border-gold bg-gold/10 text-gold"
                    : "border-border text-zinc-400 hover:text-white"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-zinc-400">
            Amount (max ${maxWithdrawable.toFixed(2)})
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            max={maxWithdrawable}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-lg border border-border bg-black px-4 py-2.5 font-mono text-white placeholder-zinc-600 outline-none transition-colors focus:border-gold/50"
          />
          <button
            type="button"
            onClick={() => setAmount(maxWithdrawable.toFixed(2))}
            className="mt-1 text-xs text-gold hover:underline"
          >
            Max
          </button>
        </div>

        {isValid && (
          <div className="rounded-lg border border-border bg-black p-4">
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-zinc-400">Withdrawal amount</dt>
                <dd className="font-mono text-white">
                  ${parsedAmount.toFixed(2)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-400">Fee</dt>
                <dd className="font-mono text-red-400">
                  -${WITHDRAWAL_FEE.toFixed(2)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-border pt-1">
                <dt className="font-medium text-zinc-300">Total debit</dt>
                <dd className="font-mono font-medium text-white">
                  ${(parsedAmount + WITHDRAWAL_FEE).toFixed(2)}
                </dd>
              </div>
            </dl>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !isValid}
          className="w-full rounded-lg bg-gold px-4 py-2.5 font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Processing withdrawal..." : `Withdraw ${currency}`}
        </button>
      </form>

      <p className="mt-4 text-xs text-zinc-500">
        A $0.10 flat fee applies to each withdrawal.
      </p>
    </div>
  );
}
