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
    <div>
      <header className="grey">
        <nav style={{ fontSize: "2em", marginLeft: "30px", padding: "10px" }}>
          <div>Spikey Coins</div>
        </nav>
      </header>

      <main>
        <div>
          <div
            className="sidenav"
            style={{
              width: "250px",
              float: "left",
              height: "calc(100vh - 57px)",
              background: "#e2e2e2",
              padding: "20px",
            }}
          >
            <ul>
              <li className="sidenav-li">
                <h3>Controls</h3>
              </li>
              <li className="sidenav-li" style={{ marginBottom: "10px" }}>
                <button
                  onClick={getSpikes}
                  disabled={loading}
                  style={{
                    opacity: loading ? 0.6 : 1,
                    width: "100%",
                    padding: "10px",
                    background: "#2196F3",
                    color: "white",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  {loading ? "Loading..." : "Refresh Ticker"}
                </button>
              </li>
              <li className="sidenav-li" style={{ marginBottom: "10px" }}>
                <button
                  onClick={refreshMarketcapData}
                  disabled={loading}
                  style={{
                    opacity: loading ? 0.6 : 1,
                    width: "100%",
                    padding: "10px",
                    background: "#2196F3",
                    color: "white",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  {loading ? "Loading..." : "Refresh Market Cap"}
                </button>
              </li>
              {error && (
                <li className="sidenav-li">
                  <div
                    style={{
                      color: "red",
                      fontSize: "0.9em",
                      padding: "10px",
                      background: "#ffebee",
                      border: "1px solid red",
                      borderRadius: "4px",
                    }}
                  >
                    {error}
                  </div>
                </li>
              )}
              <li className="sidenav-li" style={{ marginTop: "20px" }}>
                <div style={{ fontSize: "0.8em", color: "#666" }}>
                  Pairs loaded: {tickerArray.length}
                </div>
              </li>
            </ul>
          </div>

          <div
            className="main-content"
            style={{
              marginLeft: "270px",
              padding: "20px",
              height: "calc(100vh - 57px)",
              overflowY: "auto",
            }}
          >
            <Ticker tickerArray={tickerArray} loading={loading} error={error} />
          </div>
        </div>
      </main>
    </div>
  );
}
