/**
 * Configuration constants for the ticker service
 */

// API URLs and suffixes
export const BINANCE_API_BASE_URL = "https://api.binance.com"; // Consolidated base URL
export const BINANCE_KLINES_URL = `${BINANCE_API_BASE_URL}/api/v3/klines`;
export const BINANCE_WS_BASE_URL = "wss://stream.binance.com:9443"; // Removed /ws from here
export const USDT_SUFFIX = "USDT";

// Major trading pairs for initial data loading (Top 50 by volume)
export const MAJOR_PAIRS = [
  "ETHUSDT", "BTCUSDT", "USDCUSDT", "SOLUSDT", "PEPEUSDT", "XRPUSDT", "DOGEUSDT", "TRXUSDT", "BNBUSDT", "SUIUSDT",
  "UNIUSDT", "ADAUSDT", "ENAUSDT", "WIFUSDT", "AAVEUSDT", "ANIMEUSDT", "TRUMPUSDT", "LINKUSDT", "NEIROUSDT", "AVAXUSDT",
  "KAIAUSDT", "WLDUSDT", "VIRTUALUSDT", "RVNUSDT", "FETUSDT", "LTCUSDT", "OPUSDT", "ARBUSDT", "PENGUUSDT", "RESOLVUSDT",
  "AUSDT", "PNUTUSDT", "SYRUPUSDT", "CAKEUSDT", "TAOUSDT", "ETHFIUSDT", "EIGENUSDT", "TONUSDT", "JTOUSDT", "CRVUSDT",
  "NEARUSDT", "LDOUSDT", "HBARUSDT", "APTUSDT", "MASKUSDT", "SHIBUSDT", "ENSUSDT", "FLOKIUSDT", "DOTUSDT", "BONKUSDT"
];

// WebSocket stream symbols (lowercase for Binance WebSocket)
export const MAJOR_SYMBOLS = MAJOR_PAIRS.map((pair) => pair.toLowerCase());

// Timing constants
export const DELAY_BETWEEN_REQUESTS = 250; // 250ms between requests = 4 requests per second
export const WEBSOCKET_CONNECTION_DELAY = 100; // 100ms between WebSocket connections
export const CANDLESTICK_STREAM_START_DELAY = 1000; // 1 second delay before starting candlestick streams
export const HISTORICAL_DATA_INIT_DELAY = 3000; // 3 seconds delay before fetching historical data
export const REQUEST_TIMEOUT = 10000; // 10 second timeout for HTTP requests

// Batch processing constants
export const INITIAL_LOAD_BATCH_SIZE = 10; // Process 10 symbols at a time during initial load
export const PERIODIC_UPDATE_BATCH_SIZE = 5; // Process 5 symbols at a time during periodic updates

// Storage and persistence constants
export const CANDLESTICK_UPDATE_INTERVAL_MINUTES = 15; // Update stored data every 15 minutes
export const STORAGE_BACKUP_INTERVAL_HOURS = 24; // Create daily backups
export const STORAGE_BACKUP_RETENTION_DAYS = 7; // Keep backups for 7 days
export const BATCH_SIZE_STORAGE = 10; // Process symbols in batches to avoid overwhelming storage I/O

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
