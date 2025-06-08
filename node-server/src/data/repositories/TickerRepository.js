/**
 * TickerRepository
 * Manages storage and retrieval of the latest ticker data.
 */
import logger from '../../utils/logger.js';

/**
 * @typedef {import('../models/Ticker.js').Ticker} Ticker
 */

// Private store for the latest ticker data
// Array of Ticker objects
let latestTickerDataStore = [];

class TickerRepository {
  /**
   * Updates the entire list of latest tickers.
   * @param {Ticker[]} newData - An array of Ticker objects.
   */
  static updateAllTickers(newData) {
    if (!Array.isArray(newData)) {
      logger.error('TickerRepository.updateAllTickers: newData must be an array.', { type: typeof newData });
      return;
    }
    latestTickerDataStore = newData;
    // logger.debug(`TickerRepository.updateAllTickers: Updated with ${newData.length} tickers.`);
  }

  /**
   * Retrieves the latest list of all tickers.
   * @returns {Ticker[]}
   */
  static getLatestTickers() {
    return [...latestTickerDataStore]; // Return a copy to prevent direct modification
  }

  /**
   * Retrieves a specific ticker by its symbol.
   * Symbol matching is case-insensitive.
   * @param {string} symbol - The trading symbol (e.g., "BTCUSDT").
   * @returns {Ticker | undefined} The Ticker object if found, otherwise undefined.
   */
  static getTickerBySymbol(symbol) {
    if (!symbol) return undefined;
    const normalizedSymbol = symbol.toUpperCase(); // Ticker symbols are typically uppercase from Binance
    return latestTickerDataStore.find(ticker => ticker.s && ticker.s.toUpperCase() === normalizedSymbol);
  }

  /**
   * Clears all ticker data from the store.
   * Useful for testing or resetting state.
   */
  static clearAll() {
    latestTickerDataStore = [];
    logger.info('TickerRepository.clearAll: All ticker data cleared.');
  }
}

export default TickerRepository;
