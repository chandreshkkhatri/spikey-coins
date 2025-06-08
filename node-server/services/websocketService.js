/**
 * WebSocket service for handling Binance ticker and candlestick streams
 */

const logger = require("../helpers/logger"); // Import the Winston logger
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
  CANDLESTICK_INTERVALS,
  MAX_CANDLESTICKS,
  USDT_SUFFIX,
} = require("../config/constants");

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
    const interval = kline.i;
    const candlestick = {
      symbol: symbol,
      openTime: kline.t,
      closeTime: kline.T,
      open: kline.o,
      high: kline.h,
      low: kline.l,
      close: kline.c,
      volume: kline.v,
      interval: interval,
    };

    // Get existing data for this symbol and interval
    let intervalData = getCandlestickDataForSymbol(symbol, interval);
    if (!intervalData) {
      intervalData = [];
      setCandlestickDataForSymbol(symbol, interval, intervalData);
    }

    // Only store completed candlesticks (when x is true)
    if (kline.x) {
      intervalData.push(candlestick);

      // Keep only the required amount of data based on interval
      const maxCount =
        CANDLESTICK_INTERVALS[interval]?.maxCount || MAX_CANDLESTICKS;
      if (intervalData.length > maxCount) {
        intervalData.shift();
      }

      logger.debug(
        `Updated ${interval} candlestick data for ${symbol}, stored: ${intervalData.length} candles`
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
  // Start candlestick streams for major pairs with multiple timeframes
  const startCandlestickStreams = async () => {
    logger.info(
      "Starting candlestick WebSocket streams for multiple timeframes..."
    );

    const intervals = Object.keys(CANDLESTICK_INTERVALS); // ['5m', '30m', '1h']
    let streamCount = 0;

    for (let i = 0; i < MAJOR_SYMBOLS.length; i++) {
      const symbol = MAJOR_SYMBOLS[i];

      for (let j = 0; j < intervals.length; j++) {
        const interval = intervals[j];
        try {
          // Add small delay between WebSocket connections
          if (streamCount > 0) {
            await new Promise((resolve) =>
              setTimeout(resolve, WEBSOCKET_CONNECTION_DELAY)
            );
          }

          candlestickWebsocketClient.kline(symbol, interval);
          logger.debug(
            `📡 Started ${interval} candlestick stream for ${symbol.toUpperCase()}`
          );
          streamCount++;
        } catch (error) {
          logger.error(
            `Failed to start ${interval} stream for ${symbol}:`,
            error.message
          );
        }
      }
    }

    logger.info(
      `🚀 All ${streamCount} candlestick streams started (${MAJOR_SYMBOLS.length} symbols × ${intervals.length} intervals)`
    );
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
