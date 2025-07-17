"use client";

import React, { useEffect, useState, useCallback } from "react";
import { api } from "@/utils/api";
import Ticker, { TickerData } from "@/components/Ticker";
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
} from "lucide-react";

// Structured Data for SEO
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
  provider: {
    "@type": "Organization",
    name: "Spikey Coins",
  },
};

export default function HomePage() {
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

      // Transform API data to match our TickerData interface
      const transformedData: TickerData[] = rawData.map(
        (item: {
          symbol: string;
          price: number;
          price_change_24h_percent: number;
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
          s: item.symbol,
          price: item.price,
          change_24h: item.price_change_24h_percent,
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

      console.log(`Loaded ${usdtPairs.length} USDT pairs`);
      setTickerArray(usdtPairs);
    } catch (err) {
      console.error("Error fetching ticker data:", err);
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
    } catch (err) {
      console.error("Error refreshing market cap data:", err);
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
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <div className="flex h-screen bg-white">
        <Sidebar
          onRefreshTicker={getSpikes}
          onRefreshMarketCap={refreshMarketcapData}
          loading={loading}
          tickerCount={tickerArray.length}
        />

        <main className="flex-1 overflow-auto">
          <div className="flex flex-col items-center justify-start min-h-screen px-4 bg-white">
            <div className="w-full max-w-7xl mx-auto">
              {/* Header */}
              <header className="text-center py-8">
                <h1 className="text-4xl font-normal mb-4 text-gray-900 flex items-center justify-center gap-3">
                  <Coins
                    className="h-10 w-10 text-blue-600"
                    aria-hidden="true"
                  />
                  Spikey Coins
                </h1>
                <p className="text-gray-600 mb-8">
                  Real-time cryptocurrency market data and analysis for informed
                  trading decisions
                </p>

                {/* Search Input */}
                <div className="relative mb-8 max-w-2xl mx-auto">
                  <div className="relative">
                    <Input
                      className="pl-12 pr-4 py-6 text-lg rounded-xl border border-gray-200 shadow-sm focus:border-gray-300 focus:ring-0"
                      placeholder="Search for cryptocurrencies..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      aria-label="Search cryptocurrencies"
                    />
                    <div className="absolute inset-y-0 left-4 flex items-center">
                      <Search
                        className="h-5 w-5 text-gray-400"
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <section
                  className="flex flex-wrap justify-center gap-4 mb-8"
                  aria-label="Market Statistics"
                >
                  <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg">
                    <BarChart3
                      className="h-4 w-4 text-green-600"
                      aria-hidden="true"
                    />
                    <span className="text-sm text-gray-600">
                      {tickerArray.length} Pairs Loaded
                    </span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg">
                    <TrendingUp
                      className="h-4 w-4 text-blue-600"
                      aria-hidden="true"
                    />
                    <span className="text-sm text-gray-600">
                      {tickerArray.filter((t) => t.change_24h > 0).length}{" "}
                      Gainers
                    </span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg">
                    <Activity
                      className="h-4 w-4 text-red-600"
                      aria-hidden="true"
                    />
                    <span className="text-sm text-gray-600">
                      {tickerArray.filter((t) => t.change_24h < 0).length}{" "}
                      Losers
                    </span>
                  </div>
                </section>

                {/* Action Buttons */}
                <section
                  className="flex flex-wrap justify-center gap-3 mb-8"
                  aria-label="Actions"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full px-4 gap-2 border-gray-200 hover:bg-gray-50 bg-transparent"
                    onClick={getSpikes}
                    disabled={loading}
                    aria-label="Refresh cryptocurrency data"
                  >
                    <TrendingUp className="h-4 w-4" aria-hidden="true" />
                    {loading ? "Refreshing..." : "Refresh Data"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full px-4 gap-2 border-gray-200 hover:bg-gray-50 bg-transparent"
                    onClick={refreshMarketcapData}
                    disabled={loading}
                    aria-label="Update market capitalization data"
                  >
                    <DollarSign className="h-4 w-4" aria-hidden="true" />
                    Update Market Cap
                  </Button>
                </section>

                {/* Error Display */}
                {error && (
                  <div
                    className="max-w-2xl mx-auto mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
                    role="alert"
                    aria-live="polite"
                  >
                    ⚠️ {error}
                  </div>
                )}
              </header>

              {/* Main Content */}
              <section className="px-4 pb-8" aria-label="Cryptocurrency Data">
                <Ticker
                  tickerArray={tickerArray}
                  loading={loading}
                  error={error}
                  searchQuery={searchQuery}
                />
              </section>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
