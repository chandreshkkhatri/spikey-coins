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

// Data limits
const MAX_CANDLESTICKS = 48; // Last 12 hours (48 * 15min = 12h)
const CANDLESTICK_INTERVAL = "15m";
const REQUEST_TIMEOUT = 10000; // 10 second timeout for HTTP requests

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
  MAX_CANDLESTICKS,
  CANDLESTICK_INTERVAL,
  REQUEST_TIMEOUT,
};
