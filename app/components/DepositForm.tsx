"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DepositForm() {
  const router = useRouter();
  const [currency, setCurrency] = useState<"USDT" | "USDC">("USDT");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const parsedAmount = parseFloat(amount);
  const isValidAmount =
    !isNaN(parsedAmount) && parsedAmount > 0 && parsedAmount <= 5;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch("/api/wallet/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currency, amount }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Deposit failed");
      }

      setSuccess(
        `Successfully deposited $${parsedAmount.toFixed(2)} ${currency}`
      );
      setAmount("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deposit failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-gold">
        Make a Deposit
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
                onClick={() => setCurrency(c)}
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
            Amount (max $5.00)
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            max="5"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-lg border border-border bg-black px-4 py-2.5 font-mono text-white placeholder-zinc-600 outline-none transition-colors focus:border-gold/50"
          />
        </div>

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
          disabled={loading || !isValidAmount}
          className="w-full rounded-lg bg-gold px-4 py-2.5 font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Processing deposit..." : `Deposit ${currency}`}
        </button>
      </form>

      <p className="mt-4 text-xs text-zinc-500">
        No platform fees. Maximum $5.00 per deposit.
      </p>
    </div>
  );
}
