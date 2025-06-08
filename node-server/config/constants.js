/**
 * Configuration constants for the ticker service
 */

// API URLs and suffixes
const COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3";
const BINANCE_KLINES_URL = "https://api.binance.com/api/v3/klines";
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
const MAJOR_SYMBOLS = [
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
const DELAY_BETWEEN_REQUESTS = 250; // 250ms between requests = 4 requests per second
const WEBSOCKET_CONNECTION_DELAY = 100; // 100ms between WebSocket connections
const CANDLESTICK_STREAM_START_DELAY = 1000; // 1 second delay before starting candlestick streams
const HISTORICAL_DATA_INIT_DELAY = 3000; // 3 seconds delay before fetching historical data

// Data limits and intervals for different timeframes
const CANDLESTICK_INTERVALS = {
  "5m": { maxCount: 144, description: "Last 12 hours (144 * 5min = 12h)" }, // For 1h changes
  "30m": { maxCount: 48, description: "Last 24 hours (48 * 30min = 24h)" }, // For 4h and 8h changes
  "1h": { maxCount: 24, description: "Last 24 hours (24 * 1h = 24h)" }, // For 12h changes
};

// Legacy constants for backward compatibility
const MAX_CANDLESTICKS = 48; // Keep for existing 15m interval
const CANDLESTICK_INTERVAL = "15m"; // Keep for existing functionality
const REQUEST_TIMEOUT = 10000; // 10 second timeout for HTTP requests

// Calculation intervals - how many periods to look back for each timeframe
const CALCULATION_INTERVALS = {
  change_1h: { interval: "5m", periodsBack: 12 }, // 12 * 5min = 1h
  change_4h: { interval: "30m", periodsBack: 8 }, // 8 * 30min = 4h
  change_8h: { interval: "30m", periodsBack: 16 }, // 16 * 30min = 8h
  change_12h: { interval: "1h", periodsBack: 12 }, // 12 * 1h = 12h
};

// Export all constants using CommonJS syntax
module.exports = {
  COINGECKO_BASE_URL,
  BINANCE_KLINES_URL,
  USDT_SUFFIX,
  MAJOR_PAIRS,
  MAJOR_SYMBOLS,
  DELAY_BETWEEN_REQUESTS,
  WEBSOCKET_CONNECTION_DELAY,
  CANDLESTICK_STREAM_START_DELAY,
  HISTORICAL_DATA_INIT_DELAY,
  CANDLESTICK_INTERVALS,
  MAX_CANDLESTICKS,
  CANDLESTICK_INTERVAL,
  REQUEST_TIMEOUT,
  CALCULATION_INTERVALS,
};
