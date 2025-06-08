"use client";

import React, { useEffect, useState, useCallback } from "react";
import { api } from "@/utils/api"; // Using import alias @
import Ticker, { TickerData } from "@/components/Ticker"; // Using import alias @ and importing TickerData
// Styles are now imported in layout.tsx, so no need to import App.css, etc. here

// Remove default export if it exists from create-next-app template
// export default function Home() { ... }

export default function HomePage() {
  // Renamed to avoid conflict if Home was default
  const [tickerArray, setTickerArray] = useState<TickerData[]>([]); // Specify type for tickerArray
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null); // Specify type for error

  const getSpikes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get24hrTicker();
      const rawData = response.data.data || response.data || [];

      const usdtPairs = rawData.filter(
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

      <main>
        <div className="sidenav">
          <h3>📊 Controls</h3>
          <div className="sidenav-li">
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
          </div>
          <div className="sidenav-li">
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
          </div>
          {error && (
            <div className="sidenav-li">
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
            </div>
          )}
          <div className="sidenav-li" style={{ marginTop: "20px" }}>
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

        <div className="main-content">
          <Ticker tickerArray={tickerArray} loading={loading} error={error} />
        </div>
      </main>
    </div>
  );
}
