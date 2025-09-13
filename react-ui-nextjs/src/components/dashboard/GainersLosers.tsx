"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, ArrowUp, ArrowDown, AlertCircle } from "lucide-react";
import { api } from "@/utils/api";

interface CryptoItem {
  _id?: string;
  id?: string;
  symbol: string;
  name?: string;
  price: string;
  change: number;
  volume: string;
}

interface TickerData {
  _id?: string;
  s?: string;
  symbol?: string;
  price?: string;
  c?: string;
  change_24h?: string;
  P?: string;
  volume_usd?: string;
  q?: string;
}

export default function GainersLosers() {
  const [activeTab, setActiveTab] = useState<"gainers" | "losers">("gainers");
  const [gainers, setGainers] = useState<CryptoItem[]>([]);
  const [losers, setLosers] = useState<CryptoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatPrice = (price: number): string => {
    if (price >= 1000) {
      return `$${(price / 1000).toFixed(1)}K`;
    } else if (price >= 1) {
      return `$${price.toFixed(2)}`;
    } else {
      return `$${price.toFixed(4)}`;
    }
  };

  const formatVolume = (volume: number): string => {
    if (volume >= 1000000000) {
      return `$${(volume / 1000000000).toFixed(1)}B`;
    } else if (volume >= 1000000) {
      return `$${(volume / 1000000).toFixed(0)}M`;
    } else {
      return `$${(volume / 1000).toFixed(0)}K`;
    }
  };

  useEffect(() => {
    const fetchTickerData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await api.get24hrTicker();
        const tickerData = response.data?.data || response.data || [];
        
        if (tickerData.length === 0) {
          setError("No ticker data available");
          return;
        }

        const formattedData = tickerData
          .map((item: TickerData) => ({
            id: item._id || item.s || Math.random().toString(36).substring(2, 11),
            symbol: item.s?.replace('USDT', '') || 'Unknown',
            name: item.s?.replace('USDT', ''),
            price: formatPrice(parseFloat(item.price || item.c || '0')),
            change: parseFloat(item.change_24h || item.P || '0'),
            volume: formatVolume(parseFloat(item.volume_usd || item.q || '0')),
          }))
          .filter((item: CryptoItem) => !isNaN(item.change) && item.change !== 0);

        const sortedByChange = [...formattedData].sort((a, b) => b.change - a.change);
        
        const topGainers = sortedByChange.slice(0, 5);
        const topLosers = sortedByChange.slice(-5).reverse();
        
        setGainers(topGainers);
        setLosers(topLosers);
      } catch (err) {
        console.error("Error fetching ticker data for gainers/losers:", err);
        setError("Failed to load gainers and losers data");
      } finally {
        setLoading(false);
      }
    };

    fetchTickerData();
  }, []);

  const items = activeTab === "gainers" ? gainers : losers;

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex gap-2">
            <div className="h-8 bg-gray-100 rounded-lg w-24 animate-pulse"></div>
            <div className="h-8 bg-gray-100 rounded-lg w-24 animate-pulse"></div>
          </div>
          <div className="h-4 bg-gray-100 rounded w-16 animate-pulse"></div>
        </div>

        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-2.5 bg-gray-50 rounded-lg animate-pulse">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="h-3 bg-gray-200 rounded w-3"></div>
                  <div>
                    <div className="h-4 bg-gray-200 rounded w-16 mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded w-12"></div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="h-4 bg-gray-200 rounded w-16 mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-12"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || items.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("gainers")}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === "gainers"
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              Top Gainers
            </button>
            <button
              onClick={() => setActiveTab("losers")}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === "losers"
                  ? "bg-red-100 text-red-700"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <TrendingDown className="h-3.5 w-3.5" />
              Top Losers
            </button>
          </div>
          <span className="text-xs text-gray-500">Change</span>
        </div>
        <div className="flex items-center justify-center py-8 text-gray-500">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm">{error || "No data available yet"}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("gainers")}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === "gainers"
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            Top Gainers
          </button>
          <button
            onClick={() => setActiveTab("losers")}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === "losers"
                ? "bg-red-100 text-red-700"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <TrendingDown className="h-3.5 w-3.5" />
            Top Losers
          </button>
        </div>
        <span className="text-xs text-gray-500">Change</span>
      </div>

      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={item.id || item._id}
            className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-gray-500 w-4">
                {index + 1}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-gray-900">{item.symbol}</span>
                  {item.name && item.name !== item.symbol && (
                    <span className="text-xs text-gray-500">{item.name}</span>
                  )}
                </div>
                <span className="text-sm font-semibold text-gray-900">{item.price}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="text-center">
                <span className="text-xs text-gray-500 block">Timeframe</span>
                <span className="text-sm font-medium text-gray-700">24h</span>
              </div>

              <div className="flex flex-col items-end">
                <div className="flex items-center gap-1">
                  {item.change > 0 ? (
                    <ArrowUp className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <ArrowDown className="h-3.5 w-3.5 text-red-500" />
                  )}
                  <span
                    className={`text-sm font-semibold ${
                      item.change > 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {item.change > 0 ? "+" : ""}{item.change.toFixed(2)}%
                  </span>
                </div>
                <span className="text-xs text-gray-500">Vol: {item.volume}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button className="w-full mt-3 py-2 text-sm text-blue-600 hover:text-blue-700 font-medium hover:bg-blue-50 rounded-lg transition-colors">
        View All {activeTab === "gainers" ? "Gainers" : "Losers"} →
      </button>
    </div>
  );
}