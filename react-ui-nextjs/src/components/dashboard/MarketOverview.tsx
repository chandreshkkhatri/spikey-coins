"use client";

import { TrendingUp, TrendingDown } from "lucide-react";

interface CryptoIndex {
  name: string;
  symbol: string;
  price: string;
  change: number;
  volume: string;
}

const dummyIndexes: CryptoIndex[] = [
  { name: "Bitcoin", symbol: "BTC", price: "$42,850.32", change: 2.5, volume: "$24.5B" },
  { name: "Ethereum", symbol: "ETH", price: "$2,245.18", change: -1.2, volume: "$12.3B" },
  { name: "BNB", symbol: "BNB", price: "$315.42", change: 3.8, volume: "$1.2B" },
  { name: "Solana", symbol: "SOL", price: "$98.65", change: 5.2, volume: "$2.8B" },
  { name: "Cardano", symbol: "ADA", price: "$0.542", change: -2.1, volume: "$450M" },
  { name: "XRP", symbol: "XRP", price: "$0.628", change: 1.5, volume: "$1.1B" },
  { name: "Polkadot", symbol: "DOT", price: "$7.23", change: -0.8, volume: "$320M" },
  { name: "Avalanche", symbol: "AVAX", price: "$36.78", change: 4.2, volume: "$580M" },
];

export default function MarketOverview() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h2 className="text-lg font-semibold mb-3 text-gray-900">Market Overview</h2>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {dummyIndexes.map((crypto) => (
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
                {crypto.change > 0 ? "+" : ""}{crypto.change}%
              </span>
              <span className="text-xs text-gray-500">Vol: {crypto.volume}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}