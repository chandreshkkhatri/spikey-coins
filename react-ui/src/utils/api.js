import axios from "axios";
import config from "./config.json";

// API configuration
const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// API methods
export const api = {
  /**
   * Get 24-hour ticker data from Binance
   * @returns {Promise} Axios response with ticker data
   */
  async get24hrTicker() {
    try {
      const response = await apiClient.get("/api/ticker/24hr");
      return response;
    } catch (error) {
      console.error("Error fetching 24hr ticker data:", error);
      throw error;
    }
  },

  /**
   * Refresh market cap data
   * @returns {Promise} Axios response
   */
  async refreshMarketcapData() {
    try {
      const response = await apiClient.get("/api/ticker/refreshMarketcapData");
      return response;
    } catch (error) {
      console.error("Error refreshing market cap data:", error);
      throw error;
    }
  },

  /**
   * Get market cap data from CoinGecko
   * @returns {Promise} Axios response with market cap data
   */
  async getMarketCapData() {
    try {
      const response = await apiClient.get("/api/ticker/marketCap");
      return response;
    } catch (error) {
      console.error("Error fetching market cap data:", error);
      throw error;
    }
  },
};
