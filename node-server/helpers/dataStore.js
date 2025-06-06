/**
 * Data state management for ticker and candlestick data
 */

const { Console } = require("console");
const { calculatePercentageChange } = require("../helpers/calculations");
const { CALCULATION_INTERVALS } = require("../config/constants");

// Initialize logger
const logger = new Console({ stdout: process.stdout, stderr: process.stderr });

// Global state for ticker and candlestick data
let latestTickerData = [];
// Map structure: Map<symbol, Map<interval, Array<candlestick>>>
// Example: candlestickData.get("BTCUSDT").get("5m") = [array of 5min candles]
let candlestickData = new Map();

/**
 * Get price from N intervals ago for a symbol using specific timeframe
 * @param {string} symbol - Trading pair symbol
 * @param {string} interval - Timeframe interval (5m, 30m, 1h)
 * @param {number} intervalsAgo - Number of intervals to look back
 * @returns {number|null} Price from N intervals ago
 */
function getPriceNIntervalsAgo(symbol, interval, intervalsAgo) {
  const symbolIntervalData = candlestickData.get(symbol);
  if (!symbolIntervalData) return null;
  
  const intervalData = symbolIntervalData.get(interval);
  if (!intervalData || intervalData.length === 0) return null;

  // Use correct indexing - if we want price from N intervals ago,
  // and we have X candles (indices 0 to X-1), we want index (X-1-N)
  const targetIndex = intervalData.length - 1 - intervalsAgo;
  if (targetIndex < 0) return null;

  return parseFloat(intervalData[targetIndex].close);
}

/**
 * Calculate short-term changes for a symbol using appropriate timeframes
 * Uses different candlestick intervals for accurate calculations:
 * - 1h change: 5-minute intervals (12 periods back)
 * - 4h change: 30-minute intervals (8 periods back) 
 * - 8h change: 30-minute intervals (16 periods back)
 * - 12h change: 1-hour intervals (12 periods back)
 * @param {string} symbol - Trading pair symbol
 * @param {number} currentPrice - Current price
 * @returns {Object} Short-term price changes
 */
function calculateShortTermChanges(symbol, currentPrice) {
  const changes = {
    change_1h: null,
    change_4h: null,
    change_8h: null,
    change_12h: null,
  };
  try {
    // Calculate each change using appropriate timeframe and intervals
    for (const [changeKey, config] of Object.entries(CALCULATION_INTERVALS)) {
      const historicalPrice = getPriceNIntervalsAgo(
        symbol, 
        config.interval, 
        config.periodsBack
      );
      
      if (historicalPrice) {
        changes[changeKey] = calculatePercentageChange(historicalPrice, currentPrice);
      }
    }
  } catch (error) {
    logger.error(`Error calculating short-term changes for ${symbol}:`, error);
  }

  return changes;
}

/**
 * Get latest ticker data
 * @returns {Array} Latest ticker data
 */
function getLatestTickerData() {
  return latestTickerData;
}

/**
 * Set latest ticker data
 * @param {Array} data - Ticker data array
 */
function setLatestTickerData(data) {
  latestTickerData = data;
}

/**
 * Get candlestick data for all symbols
 * @returns {Map} Candlestick data map
 */
function getCandlestickData() {
  return candlestickData;
}

/**
 * Get candlestick data for a specific symbol and interval
 * @param {string} symbol - Trading pair symbol
 * @param {string} interval - Time interval (5m, 30m, 1h, etc.)
 * @returns {Array|undefined} Candlestick data for the symbol and interval
 */
function getCandlestickDataForSymbol(symbol, interval = null) {
  const symbolData = candlestickData.get(symbol);
  if (!symbolData) return undefined;
  
  if (interval) {
    return symbolData.get(interval);
  }
  
  // Return all intervals for backward compatibility
  return symbolData;
}

/**
 * Set candlestick data for a symbol and interval
 * @param {string} symbol - Trading pair symbol
 * @param {string} interval - Time interval (5m, 30m, 1h, etc.) 
 * @param {Array} data - Candlestick data array
 */
function setCandlestickDataForSymbol(symbol, interval, data) {
  if (!candlestickData.has(symbol)) {
    candlestickData.set(symbol, new Map());
  }
  candlestickData.get(symbol).set(interval, data);
}

/**
 * Legacy function: Set candlestick data for a symbol (15m interval)
 * @param {string} symbol - Trading pair symbol  
 * @param {Array} data - Candlestick data array
 */
function setCandlestickDataForSymbolLegacy(symbol, data) {
  setCandlestickDataForSymbol(symbol, "15m", data);
}

/**
 * Get number of symbols with candlestick data
 * @returns {number} Number of symbols
 */
function getCandlestickSymbolCount() {
  return candlestickData.size;
}

/**
 * Get all symbols with candlestick data
 * @returns {Array} Array of symbol names
 */
function getCandlestickSymbols() {
  return Array.from(candlestickData.keys());
}

module.exports = {
  calculateShortTermChanges,
  getLatestTickerData,
  setLatestTickerData,
  getCandlestickData,
  getCandlestickDataForSymbol,
  setCandlestickDataForSymbol,
  setCandlestickDataForSymbolLegacy,
  getCandlestickSymbolCount,
  getCandlestickSymbols,
};
