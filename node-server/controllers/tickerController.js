/**
 * Controller functions for ticker routes
 */

const { Console } = require("console");
const {
  getLatestTickerData,
  getCandlestickDataForSymbol,
  getCandlestickSymbolCount,
  getCandlestickSymbols,
  getCandlestickData,
} = require("../helpers/dataStore");
const { getRateLimitingStatus } = require("../helpers/rateLimiting");
const { fetchMarketCapData } = require("../services/apiService");

// Initialize logger
const logger = new Console({ stdout: process.stdout, stderr: process.stderr });

/**
 * Health check endpoint controller
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
function getHealthCheck(req, res) {
  res.json({
    message: "Ticker router is running",
    status: "healthy",
    tickerDataCount: getLatestTickerData().length,
    candlestickSymbols: getCandlestickSymbolCount(),
    rateLimiting: getRateLimitingStatus(),
  });
}

/**
 * Get 24hr ticker data with short-term changes
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
function get24hrTickerData(req, res) {
  try {
    const tickerData = getLatestTickerData();
    res.json({
      success: true,
      data: tickerData,
      count: tickerData.length,
      candlestickSymbols: getCandlestickSymbolCount(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Error sending ticker data:", error);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve ticker data",
    });
  }
}

/**
 * Get candlestick data for a specific symbol
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
function getCandlestickDataBySymbol(req, res) {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const data = getCandlestickDataForSymbol(symbol);

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
}

/**
 * Get all available candlestick symbols
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
function getCandlestickSummary(req, res) {
  try {
    const symbols = getCandlestickSymbols();
    const candlestickDataMap = getCandlestickData();
    const summary = symbols.map((symbol) => ({
      symbol: symbol,
      candleCount: candlestickDataMap.get(symbol).length,
      latestTime:
        candlestickDataMap.get(symbol).slice(-1)[0]?.closeTime || null,
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
}

/**
 * Refresh market cap data (placeholder for future implementation)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
function refreshMarketCapData(req, res) {
  // TODO: Implement market cap data refresh functionality
  logger.info("Market cap data refresh requested");
  res.json({
    success: true,
    message: "Market cap data refresh feature is not yet implemented",
  });
}

/**
 * Get market cap data from CoinGecko
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getMarketCapData(req, res) {
  try {
    const data = await fetchMarketCapData();

    res.json({
      success: true,
      data: data,
      count: data.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Error fetching market cap data:", error.message);

    const statusCode = error.response?.status || 500;
    const errorMessage =
      error.response?.data?.error ||
      error.message ||
      "Failed to fetch market cap data";

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
    });
  }
}

module.exports = {
  getHealthCheck,
  get24hrTickerData,
  getCandlestickDataBySymbol,
  getCandlestickSummary,
  refreshMarketCapData,
  getMarketCapData,
};
