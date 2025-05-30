import React, { useEffect, useState, useCallback } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import "./App.css";
import "./w3-styles.css";
import "./colors.css";

import AppRoutes from "./components/AppRoutes";
import { api } from "./utils/api";

function App() {
  const [tickerArray, setTickerArray] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Fetch ticker data and filter for USDT pairs
   */
  const getSpikes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get24hrTicker();
      const rawData = response.data.data || response.data;

      // Filter for USDT pairs only
      const usdtPairs = rawData.filter(
        (item) => item.s && item.s.endsWith("USDT")
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

  /**
   * Refresh market cap data and reload ticker data
   */
  const refreshMarketcapData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      await api.refreshMarketcapData();
      await getSpikes(); // Reload ticker data after refresh
    } catch (err) {
      console.error("Error refreshing market cap data:", err);
      setError("Failed to refresh market cap data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [getSpikes]);

  // Load initial data
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
        <Router>
          <div>
            <div className="sidenav">
              <ul>
                <li className="sidenav-li">
                  <h3>Controls</h3>
                </li>

                <li className="sidenav-li">
                  <button
                    onClick={getSpikes}
                    disabled={loading}
                    style={{ opacity: loading ? 0.6 : 1 }}
                  >
                    {loading ? "Loading..." : "Refresh Ticker"}
                  </button>
                </li>

                <li className="sidenav-li">
                  <button
                    onClick={refreshMarketcapData}
                    disabled={loading}
                    style={{ opacity: loading ? 0.6 : 1 }}
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
                      }}
                    >
                      {error}
                    </div>
                  </li>
                )}

                <li className="sidenav-li">
                  <div
                    style={{
                      fontSize: "0.8em",
                      color: "#666",
                      padding: "10px",
                    }}
                  >
                    Pairs loaded: {tickerArray.length}
                  </div>
                </li>
              </ul>
            </div>

            <div className="main-content right">
              <AppRoutes
                tickerArray={tickerArray}
                loading={loading}
                error={error}
              />
            </div>
          </div>
        </Router>
      </main>
    </div>
  );
}

export default App;
