import {
  getTotalUserCount,
  getTradingVolume,
  getTotalFeeRevenue,
  getWithdrawalFeeRevenue,
  getOrderBookDepth,
  getRecentTradesAnonymized,
  getTradeCount,
} from "@/lib/db/queries/transparency";
import { getOpenInterest } from "@/lib/db/queries/trading";
import { getIndexPrices, getMarkPrice } from "@/lib/services/prices";

export default async function Transparency() {
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [
    userCount,
    tradeCount,
    allTimeVolume,
    tradingFees,
    withdrawalFees,
    volume24hSpot,
    volume24hGold,
    volume24hSilver,
    oiGold,
    oiSilver,
    depthSpot,
    depthGold,
    depthSilver,
    indexPrices,
    goldMark,
    silverMark,
    recentTradesGold,
    recentTradesSilver,
    recentTradesSpot,
  ] = await Promise.all([
    getTotalUserCount(),
    getTradeCount(),
    getTradingVolume(),
    getTotalFeeRevenue(),
    getWithdrawalFeeRevenue(),
    getTradingVolume("USDT-USDC", twentyFourHoursAgo),
    getTradingVolume("XAU-PERP", twentyFourHoursAgo),
    getTradingVolume("XAG-PERP", twentyFourHoursAgo),
    getOpenInterest("XAU-PERP"),
    getOpenInterest("XAG-PERP"),
    getOrderBookDepth("USDT-USDC"),
    getOrderBookDepth("XAU-PERP"),
    getOrderBookDepth("XAG-PERP"),
    getIndexPrices(),
    getMarkPrice("XAU-PERP"),
    getMarkPrice("XAG-PERP"),
    getRecentTradesAnonymized("XAU-PERP", 10),
    getRecentTradesAnonymized("XAG-PERP", 10),
    getRecentTradesAnonymized("USDT-USDC", 10),
  ]);

  const totalFeeRevenue = (
    parseFloat(tradingFees) + parseFloat(withdrawalFees)
  ).toFixed(4);

  const allRecentTrades = [
    ...recentTradesGold,
    ...recentTradesSilver,
    ...recentTradesSpot,
  ]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 30);

  function formatPrice(pair: string, price: string): string {
    const p = parseFloat(price);
    if (pair.includes("XAU")) return p.toFixed(2);
    if (pair.includes("XAG")) return p.toFixed(3);
    return p.toFixed(4);
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-2 text-2xl font-bold text-white">
        Transparency Dashboard
      </h1>
      <p className="mb-8 text-zinc-400">
        Real-time exchange statistics and public data. All figures are from live
        exchange data.
      </p>

      {/* Hero Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Registered Users", value: userCount.toString(), accent: true },
          { label: "Total Trades", value: tradeCount.toString(), accent: false },
          {
            label: "All-Time Volume",
            value: `$${parseFloat(allTimeVolume).toFixed(2)}`,
            accent: true,
          },
          {
            label: "Fee Revenue",
            value: `$${totalFeeRevenue}`,
            accent: false,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-border bg-surface p-6 text-center"
          >
            <p className="text-xs text-zinc-500">{stat.label}</p>
            <p
              className={`mt-2 font-mono text-2xl font-bold ${stat.accent ? "text-accent-gold" : "text-white"}`}
            >
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Market Prices */}
      <div className="mb-8">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-accent-gold">
          Market Prices
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            {
              name: "Gold (XAU)",
              index: indexPrices.gold.toFixed(2),
              mark: parseFloat(goldMark.markPrice).toFixed(2),
              funding: goldMark.fundingRate,
            },
            {
              name: "Silver (XAG)",
              index: indexPrices.silver.toFixed(3),
              mark: parseFloat(silverMark.markPrice).toFixed(3),
              funding: silverMark.fundingRate,
            },
          ].map((m) => (
            <div
              key={m.name}
              className="rounded-2xl border border-border bg-surface p-6"
            >
              <h3 className="mb-3 text-sm font-medium text-white">{m.name}</h3>
              <dl className="space-y-2">
                <div className="flex justify-between">
                  <dt className="text-xs text-zinc-500">Index Price</dt>
                  <dd className="font-mono text-sm text-white">${m.index}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-xs text-zinc-500">Mark Price</dt>
                  <dd className="font-mono text-sm text-white">${m.mark}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-xs text-zinc-500">Funding Rate</dt>
                  <dd
                    className={`font-mono text-sm ${parseFloat(m.funding) >= 0 ? "text-green-400" : "text-red-400"}`}
                  >
                    {(parseFloat(m.funding) * 100).toFixed(4)}%
                  </dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      </div>

      {/* Open Interest */}
      <div className="mb-8">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-accent-gold">
          Open Interest
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { name: "XAU-PERP", data: oiGold },
            { name: "XAG-PERP", data: oiSilver },
          ].map((oi) => (
            <div
              key={oi.name}
              className="rounded-2xl border border-border bg-surface p-6"
            >
              <h3 className="mb-3 text-sm font-medium text-white">{oi.name}</h3>
              <dl className="space-y-2">
                <div className="flex justify-between">
                  <dt className="text-xs text-zinc-500">Long Contracts</dt>
                  <dd className="font-mono text-sm text-green-400">
                    {oi.data.longQuantity}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-xs text-zinc-500">Short Contracts</dt>
                  <dd className="font-mono text-sm text-red-400">
                    {oi.data.shortQuantity}
                  </dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      </div>

      {/* Order Book Depth */}
      <div className="mb-8">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-accent-gold">
          Order Book Depth
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { name: "USDT-USDC", data: depthSpot },
            { name: "XAU-PERP", data: depthGold },
            { name: "XAG-PERP", data: depthSilver },
          ].map((d) => (
            <div
              key={d.name}
              className="rounded-2xl border border-border bg-surface p-6"
            >
              <h3 className="mb-3 text-sm font-medium text-white">{d.name}</h3>
              <dl className="space-y-2">
                <div className="flex justify-between">
                  <dt className="text-xs text-zinc-500">Bid Volume</dt>
                  <dd className="font-mono text-sm text-green-400">
                    {parseFloat(d.data.bids.totalVolume).toFixed(2)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-xs text-zinc-500">Ask Volume</dt>
                  <dd className="font-mono text-sm text-red-400">
                    {parseFloat(d.data.asks.totalVolume).toFixed(2)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-xs text-zinc-500">Open Orders</dt>
                  <dd className="font-mono text-sm text-white">
                    {d.data.bids.orderCount + d.data.asks.orderCount}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-xs text-zinc-500">Spread</dt>
                  <dd className="font-mono text-sm text-zinc-300">
                    {d.data.spread ? `$${parseFloat(d.data.spread).toFixed(4)}` : "—"}
                  </dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      </div>

      {/* 24h Volume Breakdown */}
      <div className="mb-8">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-accent-gold">
          24h Volume
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { name: "USDT-USDC", volume: volume24hSpot },
            { name: "XAU-PERP", volume: volume24hGold },
            { name: "XAG-PERP", volume: volume24hSilver },
          ].map((v) => (
            <div
              key={v.name}
              className="rounded-2xl border border-border bg-surface p-6 text-center"
            >
              <p className="text-xs text-zinc-500">{v.name}</p>
              <p className="mt-2 font-mono text-lg font-semibold text-white">
                ${parseFloat(v.volume).toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Trades (Anonymized) */}
      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-accent-gold">
          Recent Trades
        </h2>
        {allRecentTrades.length === 0 ? (
          <p className="text-sm text-zinc-500">No trades yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-zinc-500">
                  <th className="px-4 py-3">Pair</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Quantity</th>
                  <th className="px-4 py-3">Time</th>
                </tr>
              </thead>
              <tbody>
                {allRecentTrades.map((t) => (
                  <tr key={t.id} className="border-b border-border/50">
                    <td className="px-4 py-2 text-white">{t.pair}</td>
                    <td className="px-4 py-2 font-mono text-white">
                      ${formatPrice(t.pair, t.price)}
                    </td>
                    <td className="px-4 py-2 font-mono text-zinc-300">
                      {t.quantity}
                    </td>
                    <td className="px-4 py-2 text-zinc-500">
                      {t.createdAt.toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="mt-8 text-center text-xs text-zinc-600">
        Data updates on each page load. All figures are from live exchange data.
      </p>
    </div>
  );
}
