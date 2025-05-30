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

// Global state for ticker data
let latestTickerData = [];
/**
 * WebSocket callbacks for Binance ticker stream
 */
const callbacks = {
  open: () => logger.debug("Connected with WebSocket server"),
  close: () => logger.debug("Disconnected with WebSocket server"),
  message: (data) => {
    try {
      const response = JSON.parse(data);
      updateTickerData(response);
    } catch (error) {
      logger.error("Error parsing WebSocket message:", error);
    }
  },
};

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
  });
}
// Initialize WebSocket connection
const websocketStreamClient = new WebsocketStream({ logger, callbacks });
websocketStreamClient.ticker();

/**
 * Routes
 */

// Health check endpoint
router.get("/", (req, res) => {
  res.json({
    message: "Ticker router is running",
    status: "healthy",
    dataCount: latestTickerData.length,
  });
});

// Get 24hr ticker data
router.get("/24hr", (req, res) => {
  try {
    res.json({
      success: true,
      data: latestTickerData,
      count: latestTickerData.length,
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
