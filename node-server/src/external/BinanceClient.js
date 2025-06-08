/**
 * Client for interacting with the Binance API.
 */
import axios, { AxiosResponse } from "axios";
import logger from "../../utils/logger.js"; // Adjusted path
import { canMakeRequest } from "../../utils/rateLimiting.js"; // Adjusted path
import {
  BINANCE_KLINES_URL,
  DELAY_BETWEEN_REQUESTS,
  REQUEST_TIMEOUT,
} from "../../config/constants.js"; // Adjusted path
import { CandlestickData } from "../../data/models/Candlestick.js"; // Assuming you'll create this

// Type definition for Binance Kline API response
interface BinanceRawKlineData {
  [index: number]: string | number;
  0: number; // Open time
  1: string; // Open price
  2: string; // High price
  3: string; // Low price
  4: string; // Close price
  5: string; // Volume
  6: number; // Close time
  // ... other fields as per Binance API docs if needed
}

class BinanceClient {
  /**
   * Fetches historical kline (candlestick) data from Binance.
   * @param {string} symbol - The trading symbol (e.g., BTCUSDT).
   * @param {string} interval - The candlestick interval (e.g., 5m, 1h).
   * @param {number} limit - The number of candlesticks to fetch.
   * @returns {Promise<CandlestickData[] | null>} A promise that resolves to an array of candlestick data or null if an error occurs.
   */
  static async fetchHistoricalCandlesticks(
    symbol: string,
    interval: string,
    limit: number
  ): Promise<CandlestickData[] | null> {
    if (!canMakeRequest()) {
      logger.warn(
        `BinanceClient: Rate limit protection triggered for ${symbol} ${interval}. Waiting before retrying or skipping.`
      );
      // Consider a more sophisticated retry or queuing mechanism here
      await new Promise((resolve) => setTimeout(resolve, REQUEST_TIMEOUT)); // Wait for timeout duration
      if (!canMakeRequest()) {
         logger.error(`BinanceClient: Still rate-limited after waiting for ${symbol} ${interval}. Skipping this fetch.`)
         return null;
      }
    }

    logger.debug(`BinanceClient: Fetching ${limit} ${interval} klines for ${symbol}`);
    try {
      const response: AxiosResponse<BinanceRawKlineData[]> = await axios.get(
        BINANCE_KLINES_URL,
        {
          params: {
            symbol: symbol.toUpperCase(), // Ensure symbol is uppercase for Binance
            interval: interval,
            limit: limit,
          },
          timeout: REQUEST_TIMEOUT,
        }
      );

      const historicalData: CandlestickData[] = response.data.map(
        (kline: BinanceRawKlineData) => ({
          symbol: symbol.toLowerCase(), // Store symbol as lowercase consistently
          openTime: kline[0],
          closeTime: kline[6],
          open: String(kline[1]),
          high: String(kline[2]),
          low: String(kline[3]),
          close: String(kline[4]),
          volume: String(kline[5]),
          interval: interval,
        })
      );
      logger.debug(
        `BinanceClient: Successfully fetched ${historicalData.length} ${interval} klines for ${symbol}`
      );
      return historicalData;
    } catch (error: any) {
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        logger.warn(
          `BinanceClient: Rate limit hit (429) for ${symbol} ${interval}. Consider increasing DELAY_BETWEEN_REQUESTS or reducing request frequency.`
        );
      } else {
        logger.error(
          `BinanceClient: Error fetching klines for ${symbol} ${interval}: ${error.message}`
        );
      }
      return null;
    }
  }

  // Placeholder for WebSocket stream creation if you move that logic here
  // static createWebSocketStreams(symbols: string[], onTickerUpdate: Function, onCandlestickUpdate: Function) { ... }
}

export default BinanceClient;
