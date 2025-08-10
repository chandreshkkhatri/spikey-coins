import axios from "axios";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

console.log("API_BASE_URL:", API_BASE_URL); // Debug log

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
      console.log("Making request to:", API_BASE_URL + "/api/ticker/24hr"); // Debug log
      const response = await apiClient.get("/api/ticker/24hr");
      return response;
    } catch (error) {
      console.error("Error fetching 24hr ticker data:", error);
      console.error("Request URL was:", API_BASE_URL + "/api/ticker/24hr"); // Debug log
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
