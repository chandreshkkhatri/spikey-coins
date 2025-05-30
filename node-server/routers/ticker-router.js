const express = require("express");
const router = express.Router();
const { Console } = require("console");
const axios = require("axios");
require("dotenv").config();
const { WebsocketStream } = require("@binance/connector");
const cors = require("cors");
const coingeckoIds = require("../coin-data/coingecko-ids.json");
const coinmarketcap = require("../coin-data/coinmarketcap.json");

// Constants
const COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3";
const USDT_SUFFIX = "USDT";

router.use(cors());

// Initialize logger and API key
const logger = new Console({ stdout: process.stdout, stderr: process.stderr });
const coingeckoApiKey = process.env.COINGECKO_API_KEY;

// Validate environment variables
if (!coingeckoApiKey) {
  logger.error("COINGECKO_API_KEY is not set in environment variables");
}

// Global state for ticker and candlestick data
let latestTickerData = [];
let candlestickData = new Map(); // Map<symbol, Array<candlestick>>

// Rate limiting and monitoring
let requestCount = 0;
let lastRequestReset = Date.now();
const REQUEST_WINDOW = 60000; // 1 minute window
const MAX_REQUESTS_PER_MINUTE = 50; // Conservative limit (well under Binance's 1200/min)

/**
 * Check if we can make a request without hitting rate limits
 */
function canMakeRequest() {
  const now = Date.now();

  // Reset counter every minute
  if (now - lastRequestReset > REQUEST_WINDOW) {
    requestCount = 0;
    lastRequestReset = now;
  }

  if (requestCount >= MAX_REQUESTS_PER_MINUTE) {
    logger.warn(
      `⚠️ Rate limit protection: ${requestCount} requests in current window`
    );
    return false;
  }

  requestCount++;
  return true;
}

/**
 * Candlestick data structure:
 * {
 *   symbol: 'BTCUSDT',
 *   openTime: 1640995200000,
 *   closeTime: 1640998799999,
 *   open: '46000.00',
 *   high: '47000.00',
 *   low: '45800.00',
 *   close: '46500.00',
 *   volume: '123.45',
 *   interval: '1h'
 * }
 */

/**
 * Calculate percentage change between two prices
 */
function calculatePercentageChange(oldPrice, newPrice) {
  if (!oldPrice || oldPrice === 0) return 0;
  return ((newPrice - oldPrice) / oldPrice) * 100;
}

/**
 * Get price from N intervals ago for a symbol (works with any timeframe)
 */
function getPriceNIntervalsAgo(symbol, intervalsAgo) {
  const symbolData = candlestickData.get(symbol);
  if (!symbolData || symbolData.length === 0) return null;

  // Fix: Use correct indexing - if we want price from 4 intervals ago,
  // and we have 48 candles (indices 0-47), we want index 43 (47-4)
  const targetIndex = symbolData.length - intervalsAgo;
  if (targetIndex < 0) return null;

  return parseFloat(symbolData[targetIndex].close);
}

/**
 * Calculate short-term changes for a symbol using 15-minute intervals
 * This provides immediate data availability:
 * - 1h change: 4 intervals ago (4 * 15min = 1h)
 * - 4h change: 16 intervals ago (16 * 15min = 4h)
 * - 8h change: 32 intervals ago (32 * 15min = 8h)
 * - 12h change: 48 intervals ago (48 * 15min = 12h)
 */
function calculateShortTermChanges(symbol, currentPrice) {
  const changes = {
    change_1h: null,
    change_4h: null,
    change_8h: null,
    change_12h: null,
  };

  try {
    // Using 15-minute intervals for efficient calculation
    const price1hAgo = getPriceNIntervalsAgo(symbol, 4); // 4 * 15min = 1h
    const price4hAgo = getPriceNIntervalsAgo(symbol, 16); // 16 * 15min = 4h
    const price8hAgo = getPriceNIntervalsAgo(symbol, 32); // 32 * 15min = 8h
    const price12hAgo = getPriceNIntervalsAgo(symbol, 48); // 48 * 15min = 12h

    if (price1hAgo)
      changes.change_1h = calculatePercentageChange(price1hAgo, currentPrice);
    if (price4hAgo)
      changes.change_4h = calculatePercentageChange(price4hAgo, currentPrice);
    if (price8hAgo)
      changes.change_8h = calculatePercentageChange(price8hAgo, currentPrice);
    if (price12hAgo)
      changes.change_12h = calculatePercentageChange(price12hAgo, currentPrice);
  } catch (error) {
    logger.error(`Error calculating short-term changes for ${symbol}:`, error);
  }

  return changes;
}

/**
 * WebSocket callbacks for Binance ticker stream
 */
const tickerCallbacks = {
  open: () => logger.debug("Connected with Ticker WebSocket server"),
  close: () => logger.debug("Disconnected with Ticker WebSocket server"),
  message: (data) => {
    try {
      const response = JSON.parse(data);
      updateTickerData(response);
    } catch (error) {
      logger.error("Error parsing Ticker WebSocket message:", error);
    }
  },
};

/**
 * WebSocket callbacks for Binance candlestick stream
 */
const candlestickCallbacks = {
  open: () => logger.debug("Connected with Candlestick WebSocket server"),
  close: () => logger.debug("Disconnected with Candlestick WebSocket server"),
  message: (data) => {
    try {
      const response = JSON.parse(data);
      updateCandlestickData(response);
    } catch (error) {
      logger.error("Error parsing Candlestick WebSocket message:", error);
    }
  },
};

/**
 * Calculate normalized volume score for a ticker item
 * This shows how significant the volume is relative to market cap
 */
function calculateNormalizedVolumeScore(item) {
  if (!item.market_cap || !item.v || !item.c) return 0;
  const volumeUSD = Number(item.v) * Number(item.c);
  const score = (volumeUSD * 100000) / Number(item.market_cap);
  return score / 100;
}

/**
 * Calculate 24h range position percentage
 * Shows where current price sits within the day's high-low range
 */
function calculate24hRangePosition(item) {
  const high = Number(item.h);
  const low = Number(item.l);
  const current = Number(item.c);

  if (high === low) return 50; // Avoid division by zero
  return ((current - low) / (high - low)) * 100;
}

/**
 * Calculate additional metrics for ticker data
 * Moves all calculations from frontend to backend
 */
function calculateAdditionalMetrics(item) {
  const metrics = {};

  // Volume calculations
  metrics.volume_usd = Number(item.v) * Number(item.c);
  metrics.volume_base = Number(item.v);

  // Range position calculation
  metrics.range_position_24h = calculate24hRangePosition(item);

  // Normalized volume score
  metrics.normalized_volume_score = calculateNormalizedVolumeScore(item);

  // Convert string numbers to actual numbers for better sorting/filtering
  metrics.price = Number(item.c);
  metrics.change_24h = Number(item.P);
  metrics.high_24h = Number(item.h);
  metrics.low_24h = Number(item.l);

  return metrics;
}

/**
 * Updates ticker data with new information from WebSocket
 * @param {Array} responseData - Array of ticker data from Binance
 */
function updateTickerData(responseData) {
  const tickerMap = new Map(latestTickerData.map((item) => [item.s, item]));
  const coinmarketcapMap = new Map(
    coinmarketcap.map((item) => [
      (item.symbol + USDT_SUFFIX).toUpperCase(),
      item,
    ])
  );

  responseData.forEach((item) => {
    if (tickerMap.has(item.s)) {
      // Update existing ticker data
      Object.assign(tickerMap.get(item.s), item);
    } else {
      // Add new ticker data
      latestTickerData.push(item);

      // Add market cap data if available
      if (item.s.endsWith(USDT_SUFFIX) && coinmarketcapMap.has(item.s)) {
        const marketCapData = coinmarketcapMap.get(item.s);
        item.market_cap = marketCapData.market_cap;
      }
    }

    // Add short-term changes if candlestick data is available
    const currentPrice = parseFloat(item.c);
    const shortTermChanges = calculateShortTermChanges(item.s, currentPrice);
    Object.assign(item, shortTermChanges);

    // Add all additional calculated metrics
    const additionalMetrics = calculateAdditionalMetrics(item);
    Object.assign(item, additionalMetrics);
  });
}

/**
 * Updates candlestick data from WebSocket
 * @param {Object} responseData - Candlestick data from Binance
 */
function updateCandlestickData(responseData) {
  try {
    const kline = responseData.k;
    if (!kline) return;

    const symbol = kline.s;
    const candlestick = {
      symbol: symbol,
      openTime: kline.t,
      closeTime: kline.T,
      open: kline.o,
      high: kline.h,
      low: kline.l,
      close: kline.c,
      volume: kline.v,
      interval: kline.i,
    };

    if (!candlestickData.has(symbol)) {
      candlestickData.set(symbol, []);
    }

    const symbolData = candlestickData.get(symbol);

    // Only store completed candlesticks (when x is true)
    if (kline.x) {
      symbolData.push(candlestick);

      // Keep only last 12 hours of data (48 candlesticks for 15m interval)
      if (symbolData.length > 48) {
        symbolData.shift();
      }

      logger.debug(
        `Updated candlestick data for ${symbol}, stored: ${symbolData.length} candles`
      );
    }
  } catch (error) {
    logger.error("Error updating candlestick data:", error);
  }
}

/**
 * Initialize historical candlestick data for major USDT pairs with rate limiting
 */
async function initializeCandlestickData() {
  try {
    logger.info(
      "Initializing historical candlestick data with rate limiting..."
    );

    // Get major USDT pairs for initial data
    const majorPairs = [
      "BTCUSDT",
      "ETHUSDT",
      "BNBUSDT",
      "ADAUSDT",
      "SOLUSDT",
      "XRPUSDT",
      "DOTUSDT",
      "DOGEUSDT",
    ];

    // Add delay between requests to respect rate limits
    const DELAY_BETWEEN_REQUESTS = 250; // 250ms between requests = 4 requests per second (well under 20/sec limit)

    for (let i = 0; i < majorPairs.length; i++) {
      const symbol = majorPairs[i];

      try {
        // Add delay before each request (except the first one)
        if (i > 0) {
          await new Promise((resolve) =>
            setTimeout(resolve, DELAY_BETWEEN_REQUESTS)
          );
        }

        // Check rate limiting
        if (!canMakeRequest()) {
          logger.warn(
            `⚠️ Rate limit protection triggered, waiting 60 seconds...`
          );
          await new Promise((resolve) => setTimeout(resolve, 60000));
          i--; // Retry the same symbol
          continue;
        }

        logger.debug(
          `Fetching historical data for ${symbol} (${i + 1}/${
            majorPairs.length
          })`
        );

        const response = await axios.get(
          `https://api.binance.com/api/v3/klines`,
          {
            params: {
              symbol: symbol,
              interval: "15m",
              limit: 48, // Last 12 hours (48 * 15min = 12h)
            },
            timeout: 10000, // 10 second timeout
          }
        );

        const historicalData = response.data.map((kline) => ({
          symbol: symbol,
          openTime: kline[0],
          closeTime: kline[6],
          open: kline[1],
          high: kline[2],
          low: kline[3],
          close: kline[4],
          volume: kline[5],
          interval: "15m",
        }));

        candlestickData.set(symbol, historicalData);
        logger.debug(
          `✅ Initialized ${historicalData.length} historical candles for ${symbol}`
        );
      } catch (error) {
        if (error.response?.status === 429) {
          logger.warn(`⚠️ Rate limit hit for ${symbol}, waiting longer...`);
          await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds
          i--; // Retry the same symbol
        } else {
          logger.error(
            `❌ Error initializing data for ${symbol}:`,
            error.message
          );
        }
      }
    }

    logger.info(
      `🎉 Candlestick data initialized for ${candlestickData.size} symbols`
    );
  } catch (error) {
    logger.error("Error during candlestick data initialization:", error);
  }
}

// Initialize WebSocket connections
const tickerWebsocketClient = new WebsocketStream({
  logger,
  callbacks: tickerCallbacks,
});
const candlestickWebsocketClient = new WebsocketStream({
  logger,
  callbacks: candlestickCallbacks,
});

// Start ticker stream
tickerWebsocketClient.ticker();

// Start candlestick streams for major pairs with staggered connections
const majorSymbols = [
  "btcusdt",
  "ethusdt",
  "bnbusdt",
  "adausdt",
  "solusdt",
  "xrpusdt",
  "dotusdt",
  "dogeusdt",
];

// Stagger WebSocket connections to avoid overwhelming the server
const startCandlestickStreams = async () => {
  logger.info("Starting candlestick WebSocket streams with rate limiting...");

  for (let i = 0; i < majorSymbols.length; i++) {
    const symbol = majorSymbols[i];

    try {
      // Add small delay between WebSocket connections
      if (i > 0) {
        await new Promise((resolve) => setTimeout(resolve, 100)); // 100ms between connections
      }

      candlestickWebsocketClient.kline(symbol, "15m");
      logger.debug(
        `📡 Started 15m candlestick stream for ${symbol.toUpperCase()}`
      );
    } catch (error) {
      logger.error(`Failed to start stream for ${symbol}:`, error.message);
    }
  }

  logger.info(`🚀 All ${majorSymbols.length} candlestick streams started`);
};

// Start streams after a brief delay to let ticker stream establish
setTimeout(startCandlestickStreams, 1000);

// Initialize historical data after WebSocket connections are established
setTimeout(initializeCandlestickData, 3000); // Wait 3 seconds before making REST API calls

/**
 * Routes
 */

// Health check endpoint
router.get("/", (req, res) => {
  res.json({
    message: "Ticker router is running",
    status: "healthy",
    tickerDataCount: latestTickerData.length,
    candlestickSymbols: candlestickData.size,
    rateLimiting: {
      requestsInCurrentWindow: requestCount,
      maxRequestsPerWindow: MAX_REQUESTS_PER_MINUTE,
      windowResetTime: new Date(
        lastRequestReset + REQUEST_WINDOW
      ).toISOString(),
    },
  });
});

// Get 24hr ticker data with short-term changes
router.get("/24hr", (req, res) => {
  try {
    res.json({
      success: true,
      data: latestTickerData,
      count: latestTickerData.length,
      candlestickSymbols: candlestickData.size,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Error sending ticker data:", error);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve ticker data",
    });
  }
});

// Get candlestick data for a specific symbol
router.get("/candlestick/:symbol", (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const data = candlestickData.get(symbol);

    if (!data) {
      return res.status(404).json({
        success: false,
        error: `No candlestick data available for ${symbol}`,
      });
    }

    res.json({
      success: true,
      symbol: symbol,
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
});

// Get all available candlestick symbols
router.get("/candlestick", (req, res) => {
  try {
    const symbols = Array.from(candlestickData.keys());
    const summary = symbols.map((symbol) => ({
      symbol: symbol,
      candleCount: candlestickData.get(symbol).length,
      latestTime: candlestickData.get(symbol).slice(-1)[0]?.closeTime || null,
    }));

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
});

// Refresh market cap data (placeholder for future implementation)
router.get("/refreshMarketcapData", (req, res) => {
  // TODO: Implement market cap data refresh functionality
  logger.info("Market cap data refresh requested");
  res.json({
    success: true,
    message: "Market cap data refresh feature is not yet implemented",
  });
});
// Get market cap data from CoinGecko
router.get("/marketCap", async (req, res) => {
  try {
    if (!coingeckoApiKey) {
      return res.status(500).json({
        success: false,
        error: "CoinGecko API key is not configured",
      });
    }

    const coinIds = coingeckoIds.map((item) => item.id).join(",");

    if (!coinIds) {
      return res.status(400).json({
        success: false,
        error: "No coin IDs available for market cap lookup",
      });
    }

    const url = `${COINGECKO_BASE_URL}/coins/markets`;
    const params = {
      x_cg_demo_api_key: coingeckoApiKey,
      vs_currency: "usd",
      ids: coinIds,
    };

    logger.info(`Fetching market cap data for ${coingeckoIds.length} coins`);

    const response = await axios.get(url, { params });

    res.json({
      success: true,
      data: response.data,
      count: response.data.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Error fetching market cap data:", error.message);

    const statusCode = error.response?.status || 500;
    const errorMessage =
      error.response?.data?.error || "Failed to fetch market cap data";

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
    });
  }
});

module.exports = router;
