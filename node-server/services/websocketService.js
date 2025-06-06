/**
 * WebSocket service for handling Binance ticker and candlestick streams
 */

const { Console } = require("console");
const { WebsocketStream } = require("@binance/connector");
const { calculateAdditionalMetrics } = require("../helpers/calculations");
const {
  calculateShortTermChanges,
  getLatestTickerData,
  setLatestTickerData,
  setCandlestickDataForSymbol,
  getCandlestickDataForSymbol,
} = require("../helpers/dataStore");
const {
  MAJOR_SYMBOLS,
  WEBSOCKET_CONNECTION_DELAY,
  CANDLESTICK_STREAM_START_DELAY,
  MAX_CANDLESTICKS,
  USDT_SUFFIX,
} = require("../config/constants");

// Initialize logger
const logger = new Console({ stdout: process.stdout, stderr: process.stderr });

// Load market cap data
const coinmarketcap = require("../coin-data/coinmarketcap.json");

/**
 * Updates ticker data with new information from WebSocket
 * @param {Array} responseData - Array of ticker data from Binance
 */
function updateTickerData(responseData) {
  const tickerMap = new Map(
    getLatestTickerData().map((item) => [item.s, item])
  );
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
      const currentData = getLatestTickerData();
      currentData.push(item);
      setLatestTickerData(currentData);
    }

    // Add market cap data if available
    if (item.s.endsWith(USDT_SUFFIX) && coinmarketcapMap.has(item.s)) {
      const marketCapData = coinmarketcapMap.get(item.s);
      item.market_cap = marketCapData.market_cap;
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

    let symbolData = getCandlestickDataForSymbol(symbol);
    if (!symbolData) {
      symbolData = [];
      setCandlestickDataForSymbol(symbol, symbolData);
    }

    // Only store completed candlesticks (when x is true)
    if (kline.x) {
      symbolData.push(candlestick);

      // Keep only last 12 hours of data (48 candlesticks for 15m interval)
      if (symbolData.length > MAX_CANDLESTICKS) {
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
 * Initialize WebSocket connections
 */
function initializeWebSockets() {
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
  const startCandlestickStreams = async () => {
    logger.info("Starting candlestick WebSocket streams with rate limiting...");

    for (let i = 0; i < MAJOR_SYMBOLS.length; i++) {
      const symbol = MAJOR_SYMBOLS[i];

      try {
        // Add small delay between WebSocket connections
        if (i > 0) {
          await new Promise((resolve) =>
            setTimeout(resolve, WEBSOCKET_CONNECTION_DELAY)
          );
        }

        candlestickWebsocketClient.kline(symbol, "15m");
        logger.debug(
          `📡 Started 15m candlestick stream for ${symbol.toUpperCase()}`
        );
      } catch (error) {
        logger.error(`Failed to start stream for ${symbol}:`, error.message);
      }
    }

    logger.info(`🚀 All ${MAJOR_SYMBOLS.length} candlestick streams started`);
  };

  // Start streams after a brief delay to let ticker stream establish
  setTimeout(startCandlestickStreams, CANDLESTICK_STREAM_START_DELAY);

  return {
    tickerWebsocketClient,
    candlestickWebsocketClient,
  };
}

module.exports = {
  initializeWebSockets,
  updateTickerData,
  updateCandlestickData,
};
