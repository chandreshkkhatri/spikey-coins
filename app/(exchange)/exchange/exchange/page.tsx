import { getSession } from "@/lib/auth/session";
import { getUserWallets } from "@/lib/db/queries/wallet";
import { getOrderBook, getRecentTrades, getUserOpenOrders } from "@/lib/db/queries/trading";

export const dynamic = "force-dynamic";
import { PAIRS } from "@/lib/trading/constants";
import LiveOrderBook from "@/app/components/LiveOrderBook";
import TradeHistory from "@/app/components/TradeHistory";
import TradingFormTabs from "@/app/components/TradingFormTabs";
import OpenOrdersTable from "@/app/components/OpenOrdersTable";

export default async function StablecoinExchange() {
  const user = await getSession();
  if (!user) return null;

  const { usdt, usdc } = await getUserWallets(user.id);
  const orderBook = await getOrderBook("USDT-USDC");
  const recentTrades = await getRecentTrades("USDT-USDC", 20);
  const openOrders = await getUserOpenOrders(user.id, "USDT-USDC");

  const pairConfig = PAIRS["USDT-USDC"];

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-2 text-2xl font-bold text-white">
        USDT / USDC Exchange
      </h1>
      <p className="mb-6 text-zinc-400">
        Exchange stablecoins at free-market rates. Place limit or market orders.
      </p>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Order Book */}
        <div>
          <LiveOrderBook
            pair="USDT-USDC"
            initialBids={orderBook.bids}
            initialAsks={orderBook.asks}
            accentColor="gold"
          />
        </div>

        {/* Center: Balances + Order Form */}
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-accent-gold/20 bg-surface p-3">
              <p className="text-xs text-accent-gold">USDT Available</p>
              <p className="font-mono text-sm font-medium text-white">
                ${parseFloat(usdt?.availableBalance ?? "0").toFixed(2)}
              </p>
            </div>
            <div className="rounded-xl border border-accent-silver/20 bg-surface p-3">
              <p className="text-xs text-accent-silver">USDC Available</p>
              <p className="font-mono text-sm font-medium text-white">
                ${parseFloat(usdc?.availableBalance ?? "0").toFixed(2)}
              </p>
            </div>
          </div>

          <TradingFormTabs
            pair="USDT-USDC"
            pairType="spot"
            minQuantity={pairConfig.minQuantity}
            tickSize={pairConfig.tickSize}
            usdtAvailable={parseFloat(usdt?.availableBalance ?? "0")}
            usdcAvailable={parseFloat(usdc?.availableBalance ?? "0")}
            currentPrice="1.0000"
            accentColor="gold"
          />
        </div>

        {/* Right: Recent Trades + Open Orders */}
        <div className="space-y-6">
          <TradeHistory trades={recentTrades} pair="USDT-USDC" accentColor="gold" />
          <OpenOrdersTable orders={openOrders} accentColor="gold" />
        </div>
      </div>
    </div>
  );
}
