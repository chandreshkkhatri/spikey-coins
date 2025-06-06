/**
 * Data state management for ticker and candlestick data
 */

const { Console } = require("console");
const { calculatePercentageChange } = require("../helpers/calculations");

// Initialize logger
const logger = new Console({ stdout: process.stdout, stderr: process.stderr });

// Global state for ticker and candlestick data
let latestTickerData = [];
let candlestickData = new Map(); // Map<symbol, Array<candlestick>>

/**
 * Get price from N intervals ago for a symbol (works with any timeframe)
 * @param {string} symbol - Trading pair symbol
 * @param {number} intervalsAgo - Number of intervals to look back
 * @returns {number|null} Price from N intervals ago
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
 * Get candlestick data for a specific symbol
 * @param {string} symbol - Trading pair symbol
 * @returns {Array|undefined} Candlestick data for the symbol
 */
function getCandlestickDataForSymbol(symbol) {
  return candlestickData.get(symbol);
}

/**
 * Set candlestick data for a symbol
 * @param {string} symbol - Trading pair symbol
 * @param {Array} data - Candlestick data array
 */
function setCandlestickDataForSymbol(symbol, data) {
  candlestickData.set(symbol, data);
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
  getCandlestickSymbolCount,
  getCandlestickSymbols,
};
