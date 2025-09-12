"use client";

import { useState } from "react";
import { Plus, Star, Trash2, TrendingUp, TrendingDown, MoreVertical } from "lucide-react";

interface WatchlistItem {
  id: string;
  symbol: string;
  name: string;
  price: string;
  change: number;
  volume: string;
}

interface Watchlist {
  id: string;
  name: string;
  items: WatchlistItem[];
}

const dummyWatchlists: Watchlist[] = [
  {
    id: "1",
    name: "My Portfolio",
    items: [
      { id: "1", symbol: "BTC", name: "Bitcoin", price: "$42,850.32", change: 2.5, volume: "$24.5B" },
      { id: "2", symbol: "ETH", name: "Ethereum", price: "$2,245.18", change: -1.2, volume: "$12.3B" },
      { id: "3", symbol: "SOL", name: "Solana", price: "$98.65", change: 5.2, volume: "$2.8B" },
    ]
  },
  {
    id: "2",
    name: "DeFi Tokens",
    items: [
      { id: "4", symbol: "UNI", name: "Uniswap", price: "$6.23", change: 3.8, volume: "$125M" },
      { id: "5", symbol: "AAVE", name: "Aave", price: "$102.45", change: -0.5, volume: "$89M" },
      { id: "6", symbol: "LINK", name: "Chainlink", price: "$14.78", change: 1.9, volume: "$342M" },
    ]
  },
  {
    id: "3",
    name: "AI & Gaming",
    items: [
      { id: "7", symbol: "FET", name: "Fetch.ai", price: "$0.823", change: 8.2, volume: "$185M" },
      { id: "8", symbol: "RNDR", name: "Render", price: "$4.56", change: 6.5, volume: "$98M" },
      { id: "9", symbol: "IMX", name: "Immutable", price: "$1.89", change: -2.3, volume: "$67M" },
    ]
  }
];

export default function Watchlist() {
  const [activeWatchlist, setActiveWatchlist] = useState("1");
  const [watchlists] = useState(dummyWatchlists);

  const currentWatchlist = watchlists.find(w => w.id === activeWatchlist);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-900">Watchlists</h2>
        <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
          <Plus className="h-4 w-4 text-gray-600" />
        </button>
      </div>

      <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
        {watchlists.map((list) => (
          <button
            key={list.id}
            onClick={() => setActiveWatchlist(list.id)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeWatchlist === list.id
                ? "bg-blue-100 text-blue-700"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {list.name}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {currentWatchlist?.items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <button className="p-1 hover:bg-gray-200 rounded transition-colors">
                <Star className="h-3.5 w-3.5 text-gray-400 hover:text-yellow-500" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-gray-900">{item.symbol}</span>
                  <span className="text-xs text-gray-500">{item.name}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-sm font-semibold text-gray-900">{item.price}</span>
                  <div className="flex items-center gap-1">
                    {item.change > 0 ? (
                      <TrendingUp className="h-3 w-3 text-green-500" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-500" />
                    )}
                    <span
                      className={`text-xs font-medium ${
                        item.change > 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {item.change > 0 ? "+" : ""}{item.change}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Vol: {item.volume}</span>
              <button className="p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-200 rounded transition-all">
                <MoreVertical className="h-3.5 w-3.5 text-gray-400" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <button className="w-full mt-3 py-2 text-sm text-blue-600 hover:text-blue-700 font-medium hover:bg-blue-50 rounded-lg transition-colors">
        Add Symbol +
      </button>
    </div>
  );
}