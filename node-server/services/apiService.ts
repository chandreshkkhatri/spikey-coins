/**
 * External API service for fetching data from Binance and CoinGecko
 */

import axios, { AxiosResponse } from "axios";
import { Console } from "console";
import { canMakeRequest } from "../helpers/rateLimiting";
import {
  setCandlestickDataForSymbol,
  CandlestickData,
} from "../helpers/dataStore";
import {
  BINANCE_KLINES_URL,
  COINGECKO_BASE_URL,
  MAJOR_PAIRS,
  DELAY_BETWEEN_REQUESTS,
  CANDLESTICK_INTERVALS,
  REQUEST_TIMEOUT,
} from "../config/constants.js";

// Initialize logger
const logger = new Console({ stdout: process.stdout, stderr: process.stderr });

// Load static data
const coingeckoIds = require("../coin-data/coingecko-ids.json");

// API key from environment
const coingeckoApiKey: string | undefined = process.env.COINGECKO_API_KEY;

// Type definitions for API responses
interface BinanceKlineData {
  [index: number]: string | number;
  0: number; // Open time
  1: string; // Open price
  2: string; // High price
  3: string; // Low price
  4: string; // Close price
  5: string; // Volume
  6: number; // Close time
  7: string; // Quote asset volume
  8: number; // Number of trades
  9: string; // Taker buy base asset volume
  10: string; // Taker buy quote asset volume
  11: string; // Ignore
}

interface CoinGeckoMarketData {
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

/**
 * Initialize historical candlestick data for major USDT pairs with multiple timeframes
 */
export async function initializeCandlestickData(): Promise<void> {
  try {
    logger.info(
      "Initializing historical candlestick data for multiple timeframes..."
    );

    const intervals = Object.keys(CANDLESTICK_INTERVALS); // ['5m', '30m', '1h']

    // Fetch data for each symbol and each interval
    for (let i = 0; i < MAJOR_PAIRS.length; i++) {
      const symbol = MAJOR_PAIRS[i];

      logger.debug(
        `Initializing data for ${symbol} (${i + 1}/${MAJOR_PAIRS.length})`
      );

      for (let j = 0; j < intervals.length; j++) {
        const interval = intervals[j];
        const config = CANDLESTICK_INTERVALS[interval];

        try {
          // Add delay between requests (except the first one)
          if (i > 0 || j > 0) {
            await new Promise((resolve) =>
              setTimeout(resolve, DELAY_BETWEEN_REQUESTS)
            );
          }

          // Check rate limiting
          if (!canMakeRequest()) {
            logger.warn(
              `⚠️ Rate limit protection triggered, waiting 60 seconds...`
            );
            await new Promise((resolve) => setTimeout(resolve, 60000));
            j--; // Retry the same interval
            continue;
          }

          logger.debug(
            `Fetching ${interval} data for ${symbol} (${config.description})`
          );

          const response: AxiosResponse<BinanceKlineData[]> = await axios.get(
            BINANCE_KLINES_URL,
            {
              params: {
                symbol: symbol,
                interval: interval,
                limit: config.maxCount,
              },
              timeout: REQUEST_TIMEOUT,
            }
          );

          const historicalData: CandlestickData[] = response.data.map(
            (kline: BinanceKlineData) => ({
              symbol: symbol,
              openTime: kline[0],
              closeTime: kline[6],
              open: kline[1],
              high: kline[2],
              low: kline[3],
              close: kline[4],
              volume: kline[5],
              interval: interval,
            })
          );

          setCandlestickDataForSymbol(symbol, interval, historicalData);
          logger.debug(
            `✅ Initialized ${historicalData.length} ${interval} candles for ${symbol}`
          );
        } catch (error: any) {
          if (error.response?.status === 429) {
            logger.warn(
              `⚠️ Rate limit hit for ${symbol} ${interval}, waiting longer...`
            );
            await new Promise((resolve) => setTimeout(resolve, 2000));
            j--; // Retry the same interval
          } else {
            logger.error(
              `❌ Error initializing ${interval} data for ${symbol}:`,
              error.message
            );
          }
        }
      }
    }

    logger.info(
      `🎉 Candlestick data initialized for ${MAJOR_PAIRS.length} symbols with multiple timeframes`
    );
  } catch (error) {
    logger.error("Error during candlestick data initialization:", error);
  }
}

/**
 * Fetch market cap data from CoinGecko API
 * @returns API response with market cap data
 */
export async function fetchMarketCapData(): Promise<CoinGeckoMarketData[]> {
  if (!coingeckoApiKey) {
    throw new Error("CoinGecko API key is not configured");
  }

  const coinIds: string = (coingeckoIds as CoinGeckoIdMapping[])
    .map((item) => item.id)
    .join(",");

  if (!coinIds) {
    throw new Error("No coin IDs available for market cap lookup");
  }

  const url = `${COINGECKO_BASE_URL}/coins/markets`;
  const params = {
    x_cg_demo_api_key: coingeckoApiKey,
    vs_currency: "usd",
    ids: coinIds,
  };

  logger.info(
    `Fetching market cap data for ${
      (coingeckoIds as CoinGeckoIdMapping[]).length
    } coins`
  );

  const response: AxiosResponse<CoinGeckoMarketData[]> = await axios.get(url, {
    params,
  });
  return response.data;
}
