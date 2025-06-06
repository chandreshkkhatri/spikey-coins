/**
 * External API service for fetching data from Binance and CoinGecko
 */

const axios = require("axios");
const { Console } = require("console");
const { canMakeRequest } = require("../helpers/rateLimiting");
const { setCandlestickDataForSymbol } = require("../helpers/dataStore");
const {
  BINANCE_KLINES_URL,
  COINGECKO_BASE_URL,
  MAJOR_PAIRS,
  DELAY_BETWEEN_REQUESTS,
  CANDLESTICK_INTERVAL,
  MAX_CANDLESTICKS,
  REQUEST_TIMEOUT,
} = require("../config/constants");

// Initialize logger
const logger = new Console({ stdout: process.stdout, stderr: process.stderr });

// Load static data
const coingeckoIds = require("../coin-data/coingecko-ids.json");

// API key from environment
const coingeckoApiKey = process.env.COINGECKO_API_KEY;

/**
 * Initialize historical candlestick data for major USDT pairs with rate limiting
 */
async function initializeCandlestickData() {
  try {
    logger.info(
      "Initializing historical candlestick data with rate limiting..."
    );

    // Add delay between requests to respect rate limits
    for (let i = 0; i < MAJOR_PAIRS.length; i++) {
      const symbol = MAJOR_PAIRS[i];

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
            MAJOR_PAIRS.length
          })`
        );

        const response = await axios.get(BINANCE_KLINES_URL, {
          params: {
            symbol: symbol,
            interval: CANDLESTICK_INTERVAL,
            limit: MAX_CANDLESTICKS, // Last 12 hours (48 * 15min = 12h)
          },
          timeout: REQUEST_TIMEOUT,
        });

        const historicalData = response.data.map((kline) => ({
          symbol: symbol,
          openTime: kline[0],
          closeTime: kline[6],
          open: kline[1],
          high: kline[2],
          low: kline[3],
          close: kline[4],
          volume: kline[5],
          interval: CANDLESTICK_INTERVAL,
        }));

        setCandlestickDataForSymbol(symbol, historicalData);
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
      `🎉 Candlestick data initialized for ${MAJOR_PAIRS.length} symbols`
    );
  } catch (error) {
    logger.error("Error during candlestick data initialization:", error);
  }
}

/**
 * Fetch market cap data from CoinGecko API
 * @returns {Promise<Object>} API response with market cap data
 */
async function fetchMarketCapData() {
  if (!coingeckoApiKey) {
    throw new Error("CoinGecko API key is not configured");
  }

  const coinIds = coingeckoIds.map((item) => item.id).join(",");

  if (!coinIds) {
    throw new Error("No coin IDs available for market cap lookup");
  }

  const url = `${COINGECKO_BASE_URL}/coins/markets`;
  const params = {
    x_cg_demo_api_key: coingeckoApiKey,
    vs_currency: "usd",
    ids: coinIds,
  };

  logger.info(`Fetching market cap data for ${coingeckoIds.length} coins`);

  const response = await axios.get(url, { params });
  return response.data;
}

module.exports = {
  initializeCandlestickData,
  fetchMarketCapData,
};
