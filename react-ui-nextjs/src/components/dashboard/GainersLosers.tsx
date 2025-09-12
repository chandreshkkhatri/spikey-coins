"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, ArrowUp, ArrowDown } from "lucide-react";

interface CryptoItem {
  id: string;
  symbol: string;
  name: string;
  price: string;
  change: number;
  volume: string;
}

const topGainers: CryptoItem[] = [
  { id: "1", symbol: "FET", name: "Fetch.ai", price: "$0.823", change: 28.5, volume: "$485M" },
  { id: "2", symbol: "RNDR", name: "Render", price: "$4.56", change: 22.3, volume: "$298M" },
  { id: "3", symbol: "INJ", name: "Injective", price: "$28.90", change: 18.7, volume: "$167M" },
  { id: "4", symbol: "NEAR", name: "NEAR Protocol", price: "$3.45", change: 15.2, volume: "$234M" },
  { id: "5", symbol: "FTM", name: "Fantom", price: "$0.421", change: 12.8, volume: "$145M" },
];

const topLosers: CryptoItem[] = [
  { id: "6", symbol: "GALA", name: "Gala", price: "$0.0234", change: -15.3, volume: "$89M" },
  { id: "7", symbol: "SAND", name: "Sandbox", price: "$0.456", change: -12.8, volume: "$124M" },
  { id: "8", symbol: "MANA", name: "Decentraland", price: "$0.389", change: -11.2, volume: "$67M" },
  { id: "9", symbol: "AXS", name: "Axie Infinity", price: "$7.89", change: -9.5, volume: "$45M" },
  { id: "10", symbol: "CHZ", name: "Chiliz", price: "$0.0789", change: -8.7, volume: "$98M" },
];

export default function GainersLosers() {
  const [activeTab, setActiveTab] = useState<"gainers" | "losers">("gainers");

  const items = activeTab === "gainers" ? topGainers : topLosers;

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
        <span className="text-xs text-gray-500">24h Change</span>
      </div>

      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-gray-500 w-4">
                {index + 1}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-gray-900">{item.symbol}</span>
                  <span className="text-xs text-gray-500">{item.name}</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{item.price}</span>
              </div>
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
                  {item.change > 0 ? "+" : ""}{item.change}%
                </span>
              </div>
              <span className="text-xs text-gray-500">Vol: {item.volume}</span>
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