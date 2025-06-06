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
  CANDLESTICK_INTERVALS,
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
 * Initialize historical candlestick data for major USDT pairs with multiple timeframes
 */
async function initializeCandlestickData() {
  try {
    logger.info(
      "Initializing historical candlestick data for multiple timeframes..."
    );

    const intervals = Object.keys(CANDLESTICK_INTERVALS); // ['5m', '30m', '1h']
    
    // Fetch data for each symbol and each interval
    for (let i = 0; i < MAJOR_PAIRS.length; i++) {
      const symbol = MAJOR_PAIRS[i];
      
      logger.debug(`Initializing data for ${symbol} (${i + 1}/${MAJOR_PAIRS.length})`);

      for (let j = 0; j < intervals.length; j++) {
        const interval = intervals[j];
        const config = CANDLESTICK_INTERVALS[interval];

        try {
          // Add delay between requests (except the first one)
          if (i > 0 || j > 0) {
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
            j--; // Retry the same interval
            continue;
          }

          logger.debug(
            `Fetching ${interval} data for ${symbol} (${config.description})`
          );

          const response = await axios.get(BINANCE_KLINES_URL, {
            params: {
              symbol: symbol,
              interval: interval,
              limit: config.maxCount,
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
            interval: interval,
          }));

          setCandlestickDataForSymbol(symbol, interval, historicalData);
          logger.debug(
            `✅ Initialized ${historicalData.length} ${interval} candles for ${symbol}`
          );
        } catch (error) {
          if (error.response?.status === 429) {
            logger.warn(`⚠️ Rate limit hit for ${symbol} ${interval}, waiting longer...`);
            await new Promise((resolve) => setTimeout(resolve, 2000));
            j--; // Retry the same interval
          } else {
            logger.error(
              `❌ Error initializing ${interval} data for ${symbol}:`,
              error.message
            );          }
        }
      }
    }

    logger.info(
      `🎉 Candlestick data initialized for ${MAJOR_PAIRS.length} symbols with multiple timeframes`
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
