/**
 * CoinGecko Client for Scripts
 * Simplified version focused on data generation tasks
 */
import axios, { AxiosResponse } from "axios";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants
const COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3";
const REQUEST_TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT || "10000", 10);
const DELAY_BETWEEN_REQUESTS = parseInt(process.env.DELAY_BETWEEN_REQUESTS || "250", 10);

export interface CoinGeckoMarketData {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  fully_diluted_valuation?: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  market_cap_change_24h: number;
  market_cap_change_percentage_24h: number;
  circulating_supply: number;
  total_supply?: number;
  max_supply?: number;
  ath: number;
  ath_change_percentage: number;
  ath_date: string;
  atl: number;
  atl_change_percentage: number;
  atl_date: string;
  roi?: {
    times: number;
    currency: string;
    percentage: number;
  };
  last_updated: string;
}

export interface CoinGeckoIdMapping {
  id: string;
  symbol: string;
  name: string;
}

export interface CoinListItem {
  id: string;
  symbol: string;
  name: string;
  platforms?: {
    [key: string]: string;
  };
}

class CoinGeckoClient {
  private static rateLimitState = {
    requestCount: 0,
    lastResetTime: Date.now(),
    maxRequestsPerMinute: 50
  };

  /**
   * Simple rate limiting check
   */
  private static canMakeRequest(): boolean {
    const now = Date.now();
    const timeWindow = 60 * 1000; // 1 minute

    // Reset counter if window has passed
    if (now - this.rateLimitState.lastResetTime > timeWindow) {
      this.rateLimitState.requestCount = 0;
      this.rateLimitState.lastResetTime = now;
    }

    return this.rateLimitState.requestCount < this.rateLimitState.maxRequestsPerMinute;
  }

  /**
   * Wait for rate limit if needed
   */
  private static async waitForRateLimit(): Promise<void> {
    if (!this.canMakeRequest()) {
      const waitTime = 60 * 1000 - (Date.now() - this.rateLimitState.lastResetTime);
      console.log(`⏳ Rate limit reached. Waiting ${Math.ceil(waitTime / 1000)} seconds...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    // Add delay between requests
    await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
    this.rateLimitState.requestCount++;
  }

  /**
   * Fetch the complete list of all coins from CoinGecko
   */
  static async fetchCoinsList(): Promise<CoinListItem[] | null> {
    const apiKey = process.env.COINGECKO_API_KEY;
    if (!apiKey) {
      console.error("❌ COINGECKO_API_KEY environment variable is required");
      return null;
    }

    await this.waitForRateLimit();

    try {
      console.log("📡 Fetching complete coins list from CoinGecko...");
      
      const response: AxiosResponse<CoinListItem[]> = await axios.get(
        `${COINGECKO_BASE_URL}/coins/list`,
        {
          params: {
            x_cg_demo_api_key: apiKey,
            include_platform: false
          },
          timeout: REQUEST_TIMEOUT,
        }
      );

      console.log(`✅ Successfully fetched ${response.data.length} coins`);
      return response.data;
    } catch (error: any) {
      console.error(`❌ Error fetching coins list: ${error.message}`);
      return null;
    }
  }

  /**
   * Fetch market data for specific coin IDs
   */
  static async fetchMarketData(coinIds?: string[]): Promise<CoinGeckoMarketData[] | null> {
    const apiKey = process.env.COINGECKO_API_KEY;
    if (!apiKey) {
      console.error("❌ COINGECKO_API_KEY environment variable is required");
      return null;
    }

    let idsToFetch: string;
    
    if (coinIds && coinIds.length > 0) {
      idsToFetch = coinIds.join(",");
    } else {
      // Load from existing coingecko-ids.json
      try {
        const outputDir = process.env.OUTPUT_DIR || "../node-server/coin-data";
        const idsFilePath = path.resolve(__dirname, outputDir, "coingecko-ids.json");
        const idsData = await fs.readFile(idsFilePath, "utf-8");
        const mappings: CoinGeckoIdMapping[] = JSON.parse(idsData);
        idsToFetch = mappings.map(item => item.id).join(",");
        
        if (!idsToFetch) {
          console.warn("⚠️ No coin IDs found in coingecko-ids.json");
          return [];
        }
      } catch (error) {
        console.error("❌ Error reading coingecko-ids.json:", error);
        return null;
      }
    }

    await this.waitForRateLimit();

    try {
      console.log(`📡 Fetching market data for ${idsToFetch.split(',').length} coins...`);
      
      const response: AxiosResponse<CoinGeckoMarketData[]> = await axios.get(
        `${COINGECKO_BASE_URL}/coins/markets`,
        {
          params: {
            x_cg_demo_api_key: apiKey,
            vs_currency: "usd",
            ids: idsToFetch,
            order: "market_cap_desc",
            per_page: 250,
            page: 1,
            sparkline: false
          },
          timeout: REQUEST_TIMEOUT,
        }
      );

      console.log(`✅ Successfully fetched market data for ${response.data.length} coins`);
      return response.data;
    } catch (error: any) {
      console.error(`❌ Error fetching market data: ${error.message}`);
      return null;
    }
  }

  /**
   * Fetch market data for top coins by market cap
   */
  static async fetchTopCoins(limit: number = 100): Promise<CoinGeckoMarketData[] | null> {
    const apiKey = process.env.COINGECKO_API_KEY;
    if (!apiKey) {
      console.error("❌ COINGECKO_API_KEY environment variable is required");
      return null;
    }

    await this.waitForRateLimit();

    try {
      console.log(`📡 Fetching top ${limit} coins by market cap...`);
      
      const response: AxiosResponse<CoinGeckoMarketData[]> = await axios.get(
        `${COINGECKO_BASE_URL}/coins/markets`,
        {
          params: {
            x_cg_demo_api_key: apiKey,
            vs_currency: "usd",
            order: "market_cap_desc",
            per_page: limit,
            page: 1,
            sparkline: false
          },
          timeout: REQUEST_TIMEOUT,
        }
      );

      console.log(`✅ Successfully fetched top ${response.data.length} coins`);
      return response.data;
    } catch (error: any) {
      console.error(`❌ Error fetching top coins: ${error.message}`);
      return null;
    }
  }
}

export default CoinGeckoClient;
