"use client";

import { useState, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import MarketOverview from "@/components/dashboard/MarketOverview";
import MarketSummary from "@/components/dashboard/MarketSummary";
import Watchlist from "@/components/dashboard/Watchlist";
import GainersLosers from "@/components/dashboard/GainersLosers";
import ChatInput from "@/components/dashboard/ChatInput";
import { api } from "@/utils/api";

export default function HomePage() {
  const [loading, setLoading] = useState(false);

  const handleRefreshTicker = useCallback(async () => {
    try {
      setLoading(true);
      await api.get24hrTicker();
      window.location.reload();
    } catch (error) {
      console.error("Error refreshing ticker data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefreshMarketCap = useCallback(async () => {
    try {
      setLoading(true);
      await api.refreshMarketcapData();
      window.location.reload();
    } catch (error) {
      console.error("Error refreshing market cap data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        onRefreshTicker={handleRefreshTicker}
        onRefreshMarketCap={handleRefreshMarketCap}
        loading={loading}
        tickerCount={0}
      />
      
      <main className="flex-1 overflow-auto pb-20">
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6">
              <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
              <p className="text-sm text-gray-600 mt-1">
                Real-time cryptocurrency market overview and insights
              </p>
            </div>

            <div className="space-y-6">
              <MarketOverview />
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <MarketSummary />
                </div>
                
                <div className="space-y-6">
                  <Watchlist />
                  <GainersLosers />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <ChatInput />
    </div>
  );
}