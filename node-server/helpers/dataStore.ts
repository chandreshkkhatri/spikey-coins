/**
 * Data state management for ticker and candlestick data
 */

import logger from "../helpers/logger";
import { calculatePercentageChange } from "../helpers/calculations";
import { CALCULATION_INTERVALS } from "../config/constants";

// Define interfaces for type safety
interface TickerData {
  e: string;
  E: number;
  s: string;
  p: string;
  P: string;
  w: string;
  x: string;
  c: string;
  Q: string;
  b: string;
  B: string;
  a: string;
  A: string;
  o: string;
  h: string;
  l: string;
  v: string;
  q: string;
  O: number;
  C: number;
  F: number;
  L: number;
  n: number;
  change_1h?: number | null;
  change_4h?: number | null;
  change_8h?: number | null;
  change_12h?: number | null;
  volume_usd?: number;
  volume_base?: number;
  range_position_24h?: number;
  normalized_volume_score?: number;
  price?: number;
  change_24h?: number;
  high_24h?: number;
  low_24h?: number;
}

interface CandlestickData {
  symbol?: string;
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
  interval?: string;
  quoteAssetVolume?: string;
  numberOfTrades?: number;
  takerBuyBaseAssetVolume?: string;
  takerBuyQuoteAssetVolume?: string;
  ignore?: string;
}

interface ShortTermChanges {
  change_1h: number | null;
  change_4h: number | null;
  change_8h: number | null;
  change_12h: number | null;
}

// Global state for ticker and candlestick data
let latestTickerData: TickerData[] = [];
// Map structure: Map<symbol, Map<interval, Array<candlestick>>>
// Example: candlestickData.get("BTCUSDT").get("5m") = [array of 5min candles]
let candlestickData: Map<string, Map<string, CandlestickData[]>> = new Map();

/**
 * Get price from N intervals ago for a symbol using specific timeframe
 * @param symbol - Trading pair symbol
 * @param interval - Timeframe interval (5m, 30m, 1h)
 * @param intervalsAgo - Number of intervals to look back
 * @returns Price from N intervals ago
 */
function getPriceNIntervalsAgo(
  symbol: string,
  interval: string,
  intervalsAgo: number
): number | null {
  const symbolIntervalData = candlestickData.get(symbol);
  if (!symbolIntervalData) return null;
  const intervalData = symbolIntervalData.get(interval);
  if (!intervalData || intervalData.length === 0) return null;

  // Use correct indexing - if we want price from N intervals ago,
  // and we have X candles (indices 0 to X-1), we want index (X-1-N)
  const targetIndex = intervalData.length - 1 - intervalsAgo;
  if (targetIndex < 0) return null;

  return parseFloat(intervalData[targetIndex].close);
}

/**
 * Calculate short-term changes for a symbol using appropriate timeframes
 * Uses different candlestick intervals for accurate calculations:
 * - 1h change: 5-minute intervals (12 periods back)
 * - 4h change: 30-minute intervals (8 periods back)
 * - 8h change: 30-minute intervals (16 periods back)
 * - 12h change: 1-hour intervals (12 periods back)
 * @param symbol - Trading pair symbol
 * @param currentPrice - Current price
 * @returns Short-term price changes
 */
function calculateShortTermChanges(
  symbol: string,
  currentPrice: number
): ShortTermChanges {
  const changes: ShortTermChanges = {
    change_1h: null,
    change_4h: null,
    change_8h: null,
    change_12h: null,
  };
  try {
    // Calculate each change using appropriate timeframe and intervals
    for (const [changeKey, config] of Object.entries(CALCULATION_INTERVALS)) {
      const intervalConfig = config as {
        interval: string;
        periodsBack: number;
      };
      const historicalPrice = getPriceNIntervalsAgo(
        symbol,
        intervalConfig.interval,
        intervalConfig.periodsBack
      );

      if (historicalPrice) {
        changes[changeKey as keyof ShortTermChanges] =
          calculatePercentageChange(historicalPrice, currentPrice);
      }
    }
  } catch (error) {
    logger.error(`Error calculating short-term changes for ${symbol}:`, error);
  }

  return changes;
}

/**
 * Get latest ticker data
 * @returns Latest ticker data
 */
function getLatestTickerData(): TickerData[] {
  return latestTickerData;
}

/**
 * Set latest ticker data
 * @param data - Ticker data array
 */
function setLatestTickerData(data: TickerData[]): void {
  latestTickerData = data;
}

/**
 * Get candlestick data for all symbols
 * @returns Candlestick data map
 */
function getCandlestickData(): Map<string, Map<string, CandlestickData[]>> {
  return candlestickData;
}

/**
 * Get candlestick data for a specific symbol and interval
 * @param symbol - Trading pair symbol
 * @param interval - Time interval (5m, 30m, 1h, etc.)
 * @returns Candlestick data for the symbol and interval, or undefined if not found
 */
function getCandlestickDataForSymbol(
  symbol: string,
  interval: string
): CandlestickData[] | undefined {
  const symbolData = candlestickData.get(symbol);
  if (!symbolData) return undefined;

  return symbolData.get(interval);
}

/**
 * Set candlestick data for a symbol and interval
 * @param symbol - Trading pair symbol
 * @param interval - Time interval (5m, 30m, 1h, etc.)
 * @param data - Candlestick data array
 */
function setCandlestickDataForSymbol(
  symbol: string,
  interval: string,
  data: CandlestickData[]
): void {
  if (!candlestickData.has(symbol)) {
    candlestickData.set(symbol, new Map());
  }
  candlestickData.get(symbol)!.set(interval, data);
}

/**
 * Legacy function: Set candlestick data for a symbol (15m interval)
 * @param symbol - Trading pair symbol
 * @param data - Candlestick data array
 */
function setCandlestickDataForSymbolLegacy(
  symbol: string,
  data: CandlestickData[]
): void {
  setCandlestickDataForSymbol(symbol, "15m", data);
}

/**
 * Get number of symbols with candlestick data
 * @returns Number of symbols
 */
function getCandlestickSymbolCount(): number {
  return candlestickData.size;
}

/**
 * Get all symbols with candlestick data
 * @returns Array of symbol names
 */
function getCandlestickSymbols(): string[] {
  return Array.from(candlestickData.keys());
}

export {
  calculateShortTermChanges,
  getLatestTickerData,
  setLatestTickerData,
  getCandlestickData,
  getCandlestickDataForSymbol,
  setCandlestickDataForSymbol,
  setCandlestickDataForSymbolLegacy,
  getCandlestickSymbolCount,
  getCandlestickSymbols,
  type TickerData,
  type CandlestickData,
  type ShortTermChanges,
};
