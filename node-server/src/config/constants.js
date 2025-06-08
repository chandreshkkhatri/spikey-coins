/**
 * Configuration constants for the ticker service
 */

// API URLs and suffixes
const COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3";
const BINANCE_API_BASE_URL = "https://api.binance.com"; // Consolidated base URL
const BINANCE_KLINES_URL = `${BINANCE_API_BASE_URL}/api/v3/klines`;
const USDT_SUFFIX = "USDT";

// Major trading pairs for initial data loading
const MAJOR_PAIRS = [
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
const MAJOR_SYMBOLS = MAJOR_PAIRS.map((pair) => pair.toLowerCase());

// Timing constants
const REQUEST_TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT, 10) || 5000; // Milliseconds
const DELAY_BETWEEN_REQUESTS = parseInt(process.env.DELAY_BETWEEN_REQUESTS, 10) || 1000; // Milliseconds
const WEBSOCKET_CONNECTION_DELAY = 100; // 100ms between WebSocket connections
const CANDLESTICK_STREAM_START_DELAY = 1000; // 1 second delay before starting candlestick streams
const HISTORICAL_DATA_INIT_DELAY = parseInt(process.env.HISTORICAL_DATA_INIT_DELAY, 10) || 2000; // Milliseconds for initial service startup
const COINGECKO_REFRESH_INTERVAL_MS = parseInt(process.env.COINGECKO_REFRESH_INTERVAL_MS, 10) || 5 * 60 * 1000; // 5 minutes

// Data limits and intervals for different timeframes
const CANDLESTICK_INTERVALS = {
  "5m": { maxCount: 144, description: "Last 12 hours (144 * 5min = 12h)" }, // For 1h changes
  "30m": { maxCount: 48, description: "Last 24 hours (48 * 30min = 24h)" }, // For 4h and 8h changes
  "1h": { maxCount: 24, description: "Last 24 hours (24 * 1h = 24h)" }, // For 12h changes
};

// Calculation intervals - how many periods to look back for each timeframe
const CALCULATION_INTERVALS = {
  change_1h: { interval: "5m", periodsBack: 12 }, // 12 * 5min = 1h
  change_4h: { interval: "30m", periodsBack: 8 }, // 8 * 30min = 4h
  change_8h: { interval: "30m", periodsBack: 16 }, // 16 * 30min = 8h
  change_12h: { interval: "1h", periodsBack: 12 }, // 12 * 1h = 12h
};

// Legacy constants (consider removing if not strictly needed)
const MAX_CANDLESTICKS = 48; // Keep for existing 15m interval
const CANDLESTICK_INTERVAL = "15m"; // Keep for existing functionality

// Export all constants using ES Module syntax if transitioning to full ESM
// For now, keeping CommonJS for broader compatibility during refactor
module.exports = {
  COINGECKO_BASE_URL,
  BINANCE_API_BASE_URL,
  BINANCE_KLINES_URL,
  USDT_SUFFIX,
  MAJOR_PAIRS,
  MAJOR_SYMBOLS,
  DELAY_BETWEEN_REQUESTS,
  WEBSOCKET_CONNECTION_DELAY,
  CANDLESTICK_STREAM_START_DELAY,
  HISTORICAL_DATA_INIT_DELAY,
  REQUEST_TIMEOUT,
  CANDLESTICK_INTERVALS,
  CALCULATION_INTERVALS,
  MAX_CANDLESTICKS,
  CANDLESTICK_INTERVAL,
  COINGECKO_REFRESH_INTERVAL_MS, // Added export
};
