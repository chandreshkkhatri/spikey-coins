"use client";

import { useEffect, useState } from "react";
import { Plus, Star, Trash2, TrendingUp, TrendingDown, MoreVertical, AlertCircle, Edit } from "lucide-react";
import { api } from "@/utils/api";

interface WatchlistItem {
  _id?: string;
  id?: string;
  symbol: string;
  name: string;
  price: string;
  change: number;
  volume: string;
}

interface Watchlist {
  _id?: string;
  id: string;
  name: string;
  items: WatchlistItem[];
  userId?: string;
}

// Default empty watchlists for new users
const defaultWatchlists: Watchlist[] = [
  { id: "1", name: "Portfolio", items: [] },
  { id: "2", name: "Watchlist", items: [] },
  { id: "3", name: "Favorites", items: [] },
];

export default function Watchlist() {
  const [activeWatchlist, setActiveWatchlist] = useState("1");
  const [watchlists, setWatchlists] = useState<Watchlist[]>(defaultWatchlists);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWatchlists = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await api.getUserWatchlists();
        const watchlistsData = response.data?.data || response.data || [];
        
        if (watchlistsData.length === 0) {
          setWatchlists(defaultWatchlists);
        } else {
          const formattedWatchlists = watchlistsData.slice(0, 3).map((list: any, index: number) => ({
            ...list,
            id: list._id || list.id || (index + 1).toString(),
            items: (list.items || []).map((item: any) => ({
              ...item,
              id: item._id || item.id || Math.random().toString(36).substr(2, 9),
            }))
          }));
          
          while (formattedWatchlists.length < 3) {
            formattedWatchlists.push({
              id: (formattedWatchlists.length + 1).toString(),
              name: `Watchlist ${formattedWatchlists.length + 1}`,
              items: []
            });
          }
          
          setWatchlists(formattedWatchlists);
        }
      } catch (err) {
        console.error("Error fetching watchlists:", err);
        setWatchlists(defaultWatchlists);
        setError("Failed to load watchlists");
      } finally {
        setLoading(false);
      }
    };

    fetchWatchlists();
  }, []);

  const currentWatchlist = watchlists.find(w => w.id === activeWatchlist) || defaultWatchlists[0];

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Watchlists</h2>
          <div className="p-1.5 bg-gray-100 rounded-lg animate-pulse">
            <div className="h-4 w-4"></div>
          </div>
        </div>

        <div className="flex gap-2 mb-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-8 bg-gray-100 rounded-lg flex-1 animate-pulse"></div>
          ))}
        </div>

        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-2.5 bg-gray-50 rounded-lg animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-1"></div>
              <div className="h-3 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

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

      {currentWatchlist?.items.length === 0 ? (
        <div className="flex items-center justify-center py-8 text-gray-500">
          <div className="text-center">
            <Star className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm mb-1">Your {currentWatchlist.name.toLowerCase()} is empty</p>
            <p className="text-xs text-gray-400">Add symbols to start tracking</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {currentWatchlist?.items.map((item) => (
            <div
              key={item.id || item._id}
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
                        {item.change > 0 ? "+" : ""}{item.change.toFixed(2)}%
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
      )}

      <button className="w-full mt-3 py-2 text-sm text-blue-600 hover:text-blue-700 font-medium hover:bg-blue-50 rounded-lg transition-colors">
        Add Symbol +
      </button>
    </div>
  );
}