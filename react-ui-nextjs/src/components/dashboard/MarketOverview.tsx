"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { api } from "@/utils/api";

interface CryptoIndex {
  name: string;
  symbol: string;
  price: string;
  change: number;
  volume: string;
  marketCap?: string;
}

interface BitcoinDominance {
  dominance: number;
  change: number;
}

const hardcodedSymbols = ["BTC", "ETH", "BNB", "SOL", "ADA", "XRP", "DOT", "AVAX"];

export default function MarketOverview() {
  const [cryptoData, setCryptoData] = useState<CryptoIndex[]>([]);
  const [btcDominance, setBtcDominance] = useState<BitcoinDominance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatPrice = (price: number): string => {
    if (price >= 1000000) {
      return `$${(price / 1000000).toFixed(2)}M`;
    } else if (price >= 1000) {
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
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [overviewResponse, dominanceResponse] = await Promise.all([
          api.getMarketOverview(),
          api.getBitcoinDominance().catch(() => null),
        ]);

        const overviewData = overviewResponse.data?.data || overviewResponse.data || [];
        
        const filteredData = hardcodedSymbols
          .map(symbol => {
            const item = overviewData.find((crypto: any) => 
              crypto.symbol?.replace('USDT', '') === symbol
            );
            if (item) {
              return {
                name: symbol,
                symbol,
                price: formatPrice(parseFloat(item.price || item.lastPrice || 0)),
                change: parseFloat(item.priceChangePercent || item.change || 0),
                volume: formatVolume(parseFloat(item.volume || item.quoteVolume || 0)),
              };
            }
            return null;
          })
          .filter(Boolean) as CryptoIndex[];

        setCryptoData(filteredData);

        if (dominanceResponse?.data) {
          setBtcDominance(dominanceResponse.data);
        }
      } catch (err) {
        console.error("Error fetching market overview:", err);
        setError("Failed to load market data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h2 className="text-lg font-semibold mb-3 text-gray-900">Market Overview</h2>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 bg-gray-100 rounded-lg p-3 min-w-[140px] animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-6 bg-gray-200 rounded mb-1"></div>
              <div className="h-3 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || cryptoData.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h2 className="text-lg font-semibold mb-3 text-gray-900">Market Overview</h2>
        <div className="flex items-center justify-center py-8 text-gray-500">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm">{error || "No market data available yet"}</p>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h2 className="text-lg font-semibold mb-3 text-gray-900">Market Overview</h2>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {btcDominance && (
          <div className="flex-shrink-0 bg-orange-50 rounded-lg p-3 min-w-[140px] hover:bg-orange-100 transition-colors cursor-pointer border border-orange-200">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-sm text-orange-900">BTC DOM</span>
              {btcDominance.change > 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
            </div>
            <div className="text-lg font-semibold text-orange-900">{btcDominance.dominance.toFixed(1)}%</div>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`text-xs font-medium ${
                  btcDominance.change > 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {btcDominance.change > 0 ? "+" : ""}{btcDominance.change.toFixed(2)}%
              </span>
              <span className="text-xs text-orange-600">Dominance</span>
            </div>
          </div>
        )}
        {cryptoData.map((crypto) => (
          <div
            key={crypto.symbol}
            className="flex-shrink-0 bg-gray-50 rounded-lg p-3 min-w-[140px] hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-sm text-gray-900">{crypto.symbol}</span>
              {crypto.change > 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
            </div>
            <div className="text-lg font-semibold text-gray-900">{crypto.price}</div>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`text-xs font-medium ${
                  crypto.change > 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {crypto.change > 0 ? "+" : ""}{crypto.change.toFixed(2)}%
              </span>
              <span className="text-xs text-gray-500">Vol: {crypto.volume}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}