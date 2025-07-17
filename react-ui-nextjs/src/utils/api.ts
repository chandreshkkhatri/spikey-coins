import axios from "axios";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

export const api = {
  async get24hrTicker() {
    try {
      const response = await apiClient.get("/api/ticker/24hr");
      return response;
    } catch (error) {
      console.error("Error fetching 24hr ticker data:", error);
      throw error;
    }
  },

  async refreshMarketcapData() {
    try {
      const response = await apiClient.get("/api/ticker/refreshMarketcapData");
      return response;
    } catch (error) {
      console.error("Error refreshing market cap data:", error);
      throw error;
    }
  },
};
