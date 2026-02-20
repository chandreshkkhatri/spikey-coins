import { getSession } from "@/lib/auth/session";
import {
  getUserPositions,
  getUserOpenOrders,
  getUserTradeHistory,
} from "@/lib/db/queries/trading";
import { getMarkPrice } from "@/lib/services/prices";
import { calculateUnrealizedPnl } from "@/lib/services/margin";
import { PAIRS } from "@/lib/trading/constants";
import type { FuturesPair } from "@/lib/trading/constants";
import PositionCard from "@/app/components/PositionCard";
import OpenOrdersTable from "@/app/components/OpenOrdersTable";

export const dynamic = "force-dynamic";

export default async function Positions() {
  const user = await getSession();
  if (!user) return null;

  const [openPositions, openOrders, tradeHistory] = await Promise.all([
    getUserPositions(user.id, "open"),
    getUserOpenOrders(user.id),
    getUserTradeHistory(user.id, 30),
  ]);

  // Enrich positions with mark prices and PnL
  const enrichedPositions = await Promise.all(
    openPositions.map(async (pos) => {
      const contract = pos.contract as FuturesPair;
      const pairConfig = PAIRS[contract];
      const markData = await getMarkPrice(contract);

      const unrealizedPnl = calculateUnrealizedPnl(
        pos.side as "long" | "short",
        pos.entryPrice,
        markData.markPrice,
        pos.quantity,
        pairConfig.contractSize
      );

      return {
        ...pos,
        unrealizedPnl: unrealizedPnl.toFixed(8),
        markPrice: markData.markPrice,
      };
    })
  );

  const totalUnrealizedPnl = enrichedPositions.reduce(
    (sum, p) => sum + parseFloat(p.unrealizedPnl),
    0
  );

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-2 text-2xl font-bold text-white">
        Positions & Orders
      </h1>
      <p className="mb-8 text-zinc-400">
        Monitor your positions, manage open orders, and view trade history.
      </p>

      {/* Open Positions */}
      <section className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-accent-gold">
            Open Positions ({enrichedPositions.length})
          </h2>
          {enrichedPositions.length > 0 && (
            <p
              className={`font-mono text-sm font-medium ${
                totalUnrealizedPnl >= 0 ? "text-green-400" : "text-red-400"
              }`}
            >
              Total PnL: {totalUnrealizedPnl >= 0 ? "+" : ""}$
              {totalUnrealizedPnl.toFixed(4)}
            </p>
          )}
        </div>
        {enrichedPositions.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface p-8 text-center">
            <p className="text-zinc-500">No open positions</p>
            <p className="mt-1 text-xs text-zinc-600">
              Open a position on the Gold or Silver futures markets.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {enrichedPositions.map((pos) => (
              <PositionCard key={pos.id} position={pos} />
            ))}
          </div>
        )}
      </section>

      {/* Open Orders */}
      <section className="mb-8">
        <OpenOrdersTable orders={openOrders} accentColor="gold" />
      </section>

      {/* Trade History */}
      <section>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-accent-gold">
            Trade History
          </h2>
          {tradeHistory.length === 0 ? (
            <p className="py-4 text-center text-sm text-zinc-500">
              No trades yet
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-zinc-500">
                    <th className="pb-2">Pair</th>
                    <th className="pb-2">Price</th>
                    <th className="pb-2">Qty</th>
                    <th className="pb-2">Role</th>
                    <th className="pb-2 text-right">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {tradeHistory.map((trade) => {
                    const isMaker = trade.makerUserId === user.id;
                    return (
                      <tr
                        key={trade.id}
                        className="border-b border-border/50"
                      >
                        <td className="py-2 text-sm text-zinc-300">
                          {trade.pair}
                        </td>
                        <td className="py-2 font-mono text-sm text-white">
                          ${parseFloat(trade.price).toFixed(2)}
                        </td>
                        <td className="py-2 font-mono text-sm text-zinc-300">
                          {parseFloat(trade.quantity).toFixed(2)}
                        </td>
                        <td className="py-2 text-xs text-zinc-500">
                          {isMaker ? "Maker" : "Taker"}
                        </td>
                        <td className="py-2 text-right text-sm text-zinc-500">
                          {trade.createdAt.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
