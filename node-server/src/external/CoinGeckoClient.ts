/**
 * Client for interacting with the CoinGecko API.
 */
import axios, { AxiosResponse } from "axios";
import logger from "../utils/logger.js"; // Adjusted path
import { canMakeRequest } from "../utils/rateLimiting.js"; // Adjusted path
import { COINGECKO_BASE_URL, REQUEST_TIMEOUT } from "../config/constants.js"; // Adjusted path

// Load static CoinGecko ID mappings
// Note: Using require for JSON is fine, or consider fs.readFile for async loading in a real app startup
const coingeckoIdMappings: CoinGeckoIdMapping[] = require("../../../coin-data/coingecko-ids.json");

// API key from environment
const coingeckoApiKey: string | undefined = process.env.COINGECKO_API_KEY;

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

interface CoinGeckoIdMapping {
  id: string;
  symbol: string;
  name: string;
}

class CoinGeckoClient {
  /**
   * Fetches market data for a list of coins from CoinGecko.
   * @returns {Promise<CoinGeckoMarketData[] | null>} A promise that resolves to an array of market data or null if an error occurs.
   */
  static async fetchMarketData(): Promise<CoinGeckoMarketData[] | null> {
    if (!coingeckoApiKey) {
      logger.error(
        "CoinGeckoClient: API key is not configured. Set COINGECKO_API_KEY environment variable."
      );
      return null;
    }

    const coinIds: string = coingeckoIdMappings
      .map((item) => item.id)
      .join(",");

    if (!coinIds) {
      logger.warn(
        "CoinGeckoClient: No coin IDs available for market cap lookup."
      );
      return []; // Return empty array if no IDs
    }

    if (!canMakeRequest()) {
      logger.warn(
        `CoinGeckoClient: Rate limit protection triggered. Waiting before retrying or skipping.`
      );
      // Consider a more sophisticated retry or queuing mechanism here
      await new Promise((resolve) => setTimeout(resolve, REQUEST_TIMEOUT));
      if (!canMakeRequest()) {
        logger.error(
          "CoinGeckoClient: Still rate-limited after waiting. Skipping market data fetch."
        );
        return null;
      }
    }

    const url = `${COINGECKO_BASE_URL}/coins/markets`;
    const params = {
      x_cg_demo_api_key: coingeckoApiKey,
      vs_currency: "usd",
      ids: coinIds,
    };

    logger.debug(
      `CoinGeckoClient: Fetching market cap data for ${coingeckoIdMappings.length} coins.`
    );

    try {
      const response: AxiosResponse<CoinGeckoMarketData[]> = await axios.get(
        url,
        {
          params,
          timeout: REQUEST_TIMEOUT,
        }
      );
      logger.debug(
        `CoinGeckoClient: Successfully fetched market data for ${response.data.length} coins.`
      );
      return response.data;
    } catch (error: any) {
      logger.error(
        `CoinGeckoClient: Error fetching market data: ${error.message}`
      );
      return null;
    }
  }
}

export default CoinGeckoClient;
