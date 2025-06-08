/**
 * Controller functions for ticker routes
 */

import { Request, Response } from "express";
import { Console } from "console";
import {
  getLatestTickerData,
  getCandlestickDataForSymbol,
  getCandlestickSymbolCount,
  getCandlestickSymbols,
  getCandlestickData,
  TickerData,
  CandlestickData,
} from "../helpers/dataStore";
import {
  getRateLimitingStatus,
  RateLimitingStatus,
} from "../helpers/rateLimiting";
import { fetchMarketCapData } from "../services/apiService";

// Initialize logger
const logger = new Console({ stdout: process.stdout, stderr: process.stderr });

// Interfaces for response objects
interface HealthCheckResponse {
  message: string;
  status: string;
  tickerDataCount: number;
  candlestickSymbols: number;
  rateLimiting: RateLimitingStatus;
}

interface TickerDataResponse {
  success: boolean;
  data: TickerData[];
  count: number;
  candlestickSymbols: number;
  timestamp: string;
}

interface ErrorResponse {
  success: boolean;
  error: string;
}

interface CandlestickDataResponse {
  success: boolean;
  symbol: string;
  interval: string;
  data: CandlestickData[];
  count: number;
  timestamp: string;
}

interface IntervalSummary {
  candleCount: number;
  latestTime: number | null;
}

interface SymbolSummary {
  symbol: string;
  intervals: Record<string, IntervalSummary>;
  totalIntervals: number;
}

interface CandlestickSummaryResponse {
  success: boolean;
  symbols: string[];
  summary: SymbolSummary[];
  count: number;
  timestamp: string;
}

interface MarketCapDataResponse {
  success: boolean;
  data: any[];
  count: number;
  timestamp: string;
}

interface RefreshResponse {
  success: boolean;
  message: string;
}

/**
 * Health check endpoint controller
 * @param req - Express request object
 * @param res - Express response object
 */
export function getHealthCheck(
  req: Request,
  res: Response<HealthCheckResponse>
): void {
  res.json({
    message: "Ticker router is running",
    status: "healthy",
    tickerDataCount: getLatestTickerData().length,
    candlestickSymbols: getCandlestickSymbolCount(),
    rateLimiting: getRateLimitingStatus(),
  });
}

/**
 * Get 24hr ticker data with short-term changes
 * @param req - Express request object
 * @param res - Express response object
 */
export function get24hrTickerData(
  req: Request,
  res: Response<TickerDataResponse | ErrorResponse>
): void {
  try {
    const tickerData = getLatestTickerData();
    res.json({
      success: true,
      data: tickerData,
      count: tickerData.length,
      candlestickSymbols: getCandlestickSymbolCount(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Error sending ticker data:", error);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve ticker data",
    });
  }
}

/**
 * Get candlestick data for a specific symbol
 * @param req - Express request object
 * @param res - Express response object
 */
export function getCandlestickDataBySymbol(
  req: Request,
  res: Response<CandlestickDataResponse | ErrorResponse>
): void {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const interval = (req.query.interval as string) || "15m"; // Default to 15m for backward compatibility

    const data = getCandlestickDataForSymbol(symbol, interval);

    if (!data) {
      res.status(404).json({
        success: false,
        error: `No candlestick data available for ${symbol} at ${interval} interval`,
      });
      return;
    }

    res.json({
      success: true,
      symbol: symbol,
      interval: interval,
      data: data,
      count: data.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Error sending candlestick data:", error);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve candlestick data",
    });
  }
}

/**
 * Get all available candlestick symbols
 * @param req - Express request object
 * @param res - Express response object
 */
export function getCandlestickSummary(
  req: Request,
  res: Response<CandlestickSummaryResponse | ErrorResponse>
): void {
  try {
    const symbols = getCandlestickSymbols();
    const candlestickDataMap = getCandlestickData();

    const summary: SymbolSummary[] = symbols.map((symbol) => {
      const symbolIntervals = candlestickDataMap.get(symbol);
      const intervals: Record<string, IntervalSummary> = {};

      // Get summary for each interval
      if (symbolIntervals) {
        for (const [interval, data] of symbolIntervals.entries()) {
          intervals[interval] = {
            candleCount: data.length,
            latestTime: data.slice(-1)[0]?.closeTime || null,
          };
        }
      }

      return {
        symbol: symbol,
        intervals: intervals,
        totalIntervals: Object.keys(intervals).length,
      };
    });

    res.json({
      success: true,
      symbols: symbols,
      summary: summary,
      count: symbols.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Error sending candlestick summary:", error);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve candlestick summary",
    });
  }
}

/**
 * Refresh market cap data (placeholder for future implementation)
 * @param req - Express request object
 * @param res - Express response object
 */
export function refreshMarketCapData(
  req: Request,
  res: Response<RefreshResponse>
): void {
  // TODO: Implement market cap data refresh functionality
  logger.info("Market cap data refresh requested");
  res.json({
    success: true,
    message: "Market cap data refresh feature is not yet implemented",
  });
}

/**
 * Get market cap data from CoinGecko
 * @param req - Express request object
 * @param res - Express response object
 */
export async function getMarketCapData(
  req: Request,
  res: Response<MarketCapDataResponse | ErrorResponse>
): Promise<void> {
  try {
    const data = await fetchMarketCapData();

    res.json({
      success: true,
      data: data,
      count: data.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Error fetching market cap data:", error.message);

    const statusCode = error.response?.status || 500;
    const errorMessage =
      error.response?.data?.error ||
      error.message ||
      "Failed to fetch market cap data";

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
    });
  }
}
