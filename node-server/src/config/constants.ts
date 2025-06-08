/**
 * Configuration constants for the ticker service
 */

// API URLs and suffixes
export const COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3";
export const BINANCE_API_BASE_URL = "https://api.binance.com"; // Consolidated base URL
export const BINANCE_KLINES_URL = `${BINANCE_API_BASE_URL}/api/v3/klines`;
export const BINANCE_WS_BASE_URL = "wss://stream.binance.com:9443/ws";
export const USDT_SUFFIX = "USDT";

// Major trading pairs for initial data loading
export const MAJOR_PAIRS = [
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
export const MAJOR_SYMBOLS = MAJOR_PAIRS.map((pair) => pair.toLowerCase());

// Timing constants
export const DELAY_BETWEEN_REQUESTS = 250; // 250ms between requests = 4 requests per second
export const WEBSOCKET_CONNECTION_DELAY = 100; // 100ms between WebSocket connections
export const CANDLESTICK_STREAM_START_DELAY = 1000; // 1 second delay before starting candlestick streams
export const HISTORICAL_DATA_INIT_DELAY = 3000; // 3 seconds delay before fetching historical data
export const REQUEST_TIMEOUT = 10000; // 10 second timeout for HTTP requests

// Data limits and intervals for different timeframes
export interface CandlestickIntervalConfig {
  maxCount: number;
  description: string;
}

export const CANDLESTICK_INTERVALS: Record<string, CandlestickIntervalConfig> =
  {
    "1m": { maxCount: 60, description: "Last 1 hour (60 * 1min = 1h)" }, // For real-time updates
    "5m": { maxCount: 144, description: "Last 12 hours (144 * 5min = 12h)" }, // For 1h changes
    "30m": { maxCount: 48, description: "Last 24 hours (48 * 30min = 24h)" }, // For 4h and 8h changes
    "1h": { maxCount: 24, description: "Last 24 hours (24 * 1h = 24h)" }, // For 12h changes
  };

// Calculation intervals - how many periods to look back for each timeframe
export interface CalculationInterval {
  interval: string;
  periodsBack: number;
}

export const CALCULATION_INTERVALS: Record<string, CalculationInterval> = {
  change_1h: { interval: "5m", periodsBack: 12 }, // 12 * 5min = 1h
  change_4h: { interval: "30m", periodsBack: 8 }, // 8 * 30min = 4h
  change_8h: { interval: "30m", periodsBack: 16 }, // 16 * 30min = 8h
  change_12h: { interval: "1h", periodsBack: 12 }, // 12 * 1h = 12h
};

// Legacy constants (consider removing if not strictly needed)
export const MAX_CANDLESTICKS = 48; // Keep for existing 15m interval
export const CANDLESTICK_INTERVAL = "15m"; // Keep for existing functionality
