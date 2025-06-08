/**
 * Configuration constants for the ticker service
 */

// API URLs and suffixes
export const COINGECKO_BASE_URL: string = "https://api.coingecko.com/api/v3";
export const BINANCE_KLINES_URL: string =
  "https://api.binance.com/api/v3/klines";
export const USDT_SUFFIX: string = "USDT";

// Major trading pairs for initial data loading
export const MAJOR_PAIRS: string[] = [
  "BTCUSDT",
  "ETHUSDT",
  "BNBUSDT",
  "ADAUSDT",
  "SOLUSDT",
  "XRPUSDT",
  "DOTUSDT",
  "DOGEUSDT",
];

// WebSocket stream symbols (lowercase for Binance WebSocket)
export const MAJOR_SYMBOLS: string[] = [
  "btcusdt",
  "ethusdt",
  "bnbusdt",
  "adausdt",
  "solusdt",
  "xrpusdt",
  "dotusdt",
  "dogeusdt",
];

// Timing constants
export const DELAY_BETWEEN_REQUESTS: number = 250; // 250ms between requests = 4 requests per second
export const WEBSOCKET_CONNECTION_DELAY: number = 100; // 100ms between WebSocket connections
export const CANDLESTICK_STREAM_START_DELAY: number = 1000; // 1 second delay before starting candlestick streams
export const HISTORICAL_DATA_INIT_DELAY: number = 3000; // 3 seconds delay before fetching historical data

// Data limits and intervals for different timeframes
export const CANDLESTICK_INTERVALS: Record<
  string,
  { maxCount: number; description: string }
> = {
  "5m": { maxCount: 144, description: "Last 12 hours (144 * 5min = 12h)" }, // For 1h changes
  "30m": { maxCount: 48, description: "Last 24 hours (48 * 30min = 24h)" }, // For 4h and 8h changes
  "1h": { maxCount: 24, description: "Last 24 hours (24 * 1h = 24h)" }, // For 12h changes
};

// Legacy constants for backward compatibility
export const MAX_CANDLESTICKS: number = 48; // Keep for existing 15m interval
export const CANDLESTICK_INTERVAL: string = "15m"; // Keep for existing functionality
export const REQUEST_TIMEOUT: number = 10000; // 10 second timeout for HTTP requests

// Calculation intervals - how many periods to look back for each timeframe
export const CALCULATION_INTERVALS: Record<
  string,
  { interval: string; periodsBack: number }
> = {
  change_1h: { interval: "5m", periodsBack: 12 }, // 12 * 5min = 1h
  change_4h: { interval: "30m", periodsBack: 8 }, // 8 * 30min = 4h
  change_8h: { interval: "30m", periodsBack: 16 }, // 16 * 30min = 8h
  change_12h: { interval: "1h", periodsBack: 12 }, // 12 * 1h = 12h
};
