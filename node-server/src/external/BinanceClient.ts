/**
 * Client for interacting with the Binance API.
 */
import axios, { AxiosResponse } from "axios";
import logger from "../utils/logger.js";
import { canMakeRequest } from "../utils/rateLimiting.js";
import {
  BINANCE_KLINES_URL,
  DELAY_BETWEEN_REQUESTS,
  REQUEST_TIMEOUT,
} from "../config/constants.js";
import { Candlestick } from "../data/models/Candlestick.js";

// Type definition for Binance Kline API response
interface BinanceRawKlineData extends Array<string | number> {
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

class BinanceClient {
  /**
   * Fetches historical kline (candlestick) data from Binance.
   */
  static async fetchHistoricalCandlesticks(
    symbol: string,
    interval: string,
    limit: number
  ): Promise<Candlestick[] | null> {
    if (!canMakeRequest()) {
      // Rate limiting - wait silently without logging every occurrence
      await new Promise((resolve) => setTimeout(resolve, REQUEST_TIMEOUT));
      if (!canMakeRequest()) {
        // Only log if still rate-limited after waiting
        logger.warn(
          `BinanceClient: Rate limited for ${symbol} ${interval}, skipping fetch`
        );
        return null;
      }
    }

    // Apply delay between requests to be respectful to the API
    await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));

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

      const historicalData: Candlestick[] = response.data.map(
        (kline: BinanceRawKlineData) => ({
          openTime: kline[0] as number,
          open: parseFloat(kline[1] as string),
          high: parseFloat(kline[2] as string),
          low: parseFloat(kline[3] as string),
          close: parseFloat(kline[4] as string),
          volume: parseFloat(kline[5] as string),
          closeTime: kline[6] as number,
          quoteAssetVolume: parseFloat(kline[7] as string),
          numberOfTrades: kline[8] as number,
          takerBuyBaseAssetVolume: parseFloat(kline[9] as string),
          takerBuyQuoteAssetVolume: parseFloat(kline[10] as string),
          isClosed: true, // Historical data is always closed
        })
      );
      return historicalData;
    } catch (error: any) {
      if (error.response?.status === 429) {
        logger.warn(
          `BinanceClient: Rate limit (429) for ${symbol} ${interval}`
        );
      } else if (error.response?.status === 400) {
        // Don't log 400 errors as they're expected for invalid symbols
        return null;
      } else {
        logger.error(
          `BinanceClient: Error fetching klines for ${symbol} ${interval}: ${error.message}`
        );
      }
      return null;
    }
  }
}

export default BinanceClient;
