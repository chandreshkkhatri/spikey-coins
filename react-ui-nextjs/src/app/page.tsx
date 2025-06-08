"use client";

import React, { useEffect, useState, useCallback } from "react";
import { api } from "@/utils/api";
import Ticker, { TickerData } from "@/components/Ticker";

export default function HomePage() {
  const [tickerArray, setTickerArray] = useState<TickerData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <div className="min-h-screen bg-gray-50">
      <header className="grey">
        <nav style={{ fontSize: "1.8em", padding: "15px 30px" }}>
          <div>🚀 Spikey Coins</div>
        </nav>
      </header>

      {/* Layout */}
      <div className="main-layout">
        {/* Sidebar */}
        <div className="sidebar-container">
          <h3>📊 Controls</h3>
          <button
            onClick={getSpikes}
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px 16px",
              background: loading ? "#94a3b8" : "#10b981",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: "14px",
              fontWeight: "600",
              marginBottom: "12px",
              transition: "all 0.2s ease",
            }}
          >
            {loading ? "🔄 Loading..." : "🔄 Refresh Ticker"}
          </button>

          <button
            onClick={refreshMarketcapData}
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px 16px",
              background: loading ? "#94a3b8" : "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: "14px",
              fontWeight: "600",
              marginBottom: "12px",
              transition: "all 0.2s ease",
            }}
          >
            {loading ? "🔄 Loading..." : "📈 Refresh Market Cap"}
          </button>

          {error && (
            <div
              style={{
                color: "#fee2e2",
                fontSize: "13px",
                padding: "12px",
                background: "rgba(239, 68, 68, 0.2)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                borderRadius: "8px",
                marginBottom: "12px",
              }}
            >
              ⚠️ {error}
            </div>
          )}

          <div style={{ marginTop: "20px" }}>
            <div
              style={{
                fontSize: "13px",
                color: "rgba(255, 255, 255, 0.8)",
                padding: "12px",
                background: "rgba(255, 255, 255, 0.1)",
                borderRadius: "8px",
                textAlign: "center",
              }}
            >
              💰 Pairs loaded: <strong>{tickerArray.length}</strong>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="main-content-container">
          <Ticker tickerArray={tickerArray} loading={loading} error={error} />
        </div>
      </div>
    </div>
  );
}
