"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/utils/api";
import Ticker, { type TickerData } from "@/components/Ticker";
import Sidebar from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  TrendingUp,
  Activity,
  DollarSign,
  BarChart3,
  Coins,
  RefreshCw,
} from "lucide-react";

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Spikey Coins",
  description:
    "Real-time cryptocurrency market data and analysis platform for tracking USDT trading pairs",
  url: "https://spikeycoins.com",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web Browser",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  author: {
    "@type": "Organization",
    name: "Spikey Coins",
  },
};

export default function ScreenerPage() {
  const [tickerArray, setTickerArray] = useState<TickerData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const getSpikes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get24hrTicker();
      const rawData = response.data.data || response.data || [];
      const transformedData: TickerData[] = rawData.map(
        (item: {
          s: string;                    // Backend sends 's' for symbol
          price: number;
          change_24h: number;           // Backend sends 'change_24h' 
          change_12h?: number | null;
          change_8h?: number | null;
          change_4h?: number | null;
          change_1h?: number | null;
          high_24h: number;
          low_24h: number;
          range_position_24h: number;
          volume_usd: number;
          volume_base: number;
          market_cap?: number | null;
          normalized_volume_score?: number;
        }) => ({
          s: item.s,                    // Use 's' directly from backend
          price: item.price,
          change_24h: item.change_24h,  // Use 'change_24h' directly from backend
          change_12h: item.change_12h,
          change_8h: item.change_8h,
          change_4h: item.change_4h,
          change_1h: item.change_1h,
          high_24h: item.high_24h,
          low_24h: item.low_24h,
          range_position_24h: item.range_position_24h,
          volume_usd: item.volume_usd,
          volume_base: item.volume_base,
          market_cap: item.market_cap,
          normalized_volume_score: item.normalized_volume_score || 0,
        })
      );
      const usdtPairs = transformedData.filter(
        (item: TickerData) =>
          item.s && typeof item.s === "string" && item.s.endsWith("USDT")
      );
      setTickerArray(usdtPairs);
    } catch {
      setError("Failed to fetch ticker data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshMarketcapData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await api.refreshMarketcapData();
      await getSpikes();
    } catch {
      setError("Failed to refresh market cap data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [getSpikes]);

  useEffect(() => {
    getSpikes();
  }, [getSpikes]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <div className="flex h-screen bg-white">
        <Sidebar
          onRefreshTicker={getSpikes}
          loading={loading}
          tickerCount={tickerArray.length}
        />
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          <div className="flex flex-col items-center justify-start w-full">
            <div className="w-full max-w-7xl mx-auto">
              <div className="text-center max-w-2xl mx-auto">
                <h1 className="text-4xl font-normal mb-4 text-gray-900 flex items-center justify-center gap-3">
                  <Coins className="h-10 w-10 text-blue-600" />
                  Spikey Coins Screener
                </h1>
                <div className="relative mb-4">
                  <Input
                    className="pl-12 pr-4 py-6 text-lg rounded-xl border border-gray-200 shadow-sm focus:border-gray-300 focus:ring-0"
                    placeholder="Search for cryptocurrencies..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
                <div className="flex flex-wrap justify-center gap-2 mb-6">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full px-3 gap-2 border-gray-200 hover:bg-gray-50 bg-transparent"
                    onClick={getSpikes}
                    disabled={loading}
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                    />
                    {loading ? "Refreshing..." : "Refresh"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full px-3 gap-2 border-gray-200 hover:bg-gray-50 bg-transparent"
                    onClick={refreshMarketcapData}
                    disabled={loading}
                  >
                    <DollarSign className="h-4 w-4" />
                    Update Market Cap
                  </Button>
                  <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-full text-sm">
                    <BarChart3 className="h-4 w-4 text-gray-500" />
                    <span>{tickerArray.length} Pairs</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-full text-sm">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span>
                      {tickerArray.filter((t) => t.change_24h > 0).length}{" "}
                      Gainers
                    </span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-full text-sm">
                    <Activity className="h-4 w-4 text-red-500" />
                    <span>
                      {tickerArray.filter((t) => t.change_24h < 0).length}{" "}
                      Losers
                    </span>
                  </div>
                </div>
              </div>

              {error && (
                <div
                  className="max-w-2xl mx-auto mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
                  role="alert"
                >
                  ⚠️ {error}
                </div>
              )}

              <Ticker
                tickerArray={tickerArray}
                loading={loading}
                error={error}
                searchQuery={searchQuery}
              />
            </div>
          </div>
        </main>
      </div>
    </>
  );
}