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
      throw error;
    }
  },

  async refreshMarketcapData() {
    try {
      const response = await apiClient.get("/api/ticker/refreshMarketcapData");
      return response;
    } catch (error) {
      throw error;
    }
  },

  async getMarketOverview() {
    try {
      const response = await apiClient.get("/api/market/overview");
      return response;
    } catch (error) {
      throw error;
    }
  },

  async getSummaries() {
    try {
      const response = await apiClient.get("/api/summaries");
      return response;
    } catch (error) {
      throw error;
    }
  },

  async getUserWatchlists(userId?: string) {
    try {
      const url = userId ? `/api/watchlists?userId=${userId}` : "/api/watchlists";
      const response = await apiClient.get(url);
      return response;
    } catch (error) {
      throw error;
    }
  },

  async forceRefreshMarketOverview() {
    try {
      const response = await apiClient.post("/api/market/overview/refresh");
      return response;
    } catch (error) {
      throw error;
    }
  },

  async get7dTopMovers() {
    try {
      const response = await apiClient.get("/api/ticker/7d");
      return response;
    } catch (error) {
      throw error;
    }
  },
};
