/**
 * CandlestickRepository
 * Manages storage and retrieval of candlestick data.
 */
import logger from '../../utils/logger.js';
import { CANDLESTICK_INTERVALS } from '../../config/constants.js';

/**
 * @typedef {import('../models/Candlestick.js').Candlestick} Candlestick
 */

// Private store for candlestick data
// Structure: Map<string_lowercase_symbol, Map<string_interval, Candlestick[]>>
const candlestickDataStore = new Map();

class CandlestickRepository {
  /**
   * Stores an array of candlesticks for a given symbol and interval.
   * Ensures the symbol is stored in lowercase for consistency.
   * Trims the data to the maxCount defined in CANDLESTICK_INTERVALS.
   * @param {string} symbol - The trading symbol (e.g., "BTCUSDT").
   * @param {string} interval - The candlestick interval (e.g., "5m", "1h").
   * @param {Candlestick[]} data - An array of candlestick objects.
   */
  static setCandlesticks(symbol, interval, data) {
    if (!symbol || !interval || !Array.isArray(data)) {
      logger.error('CandlestickRepository.setCandlesticks: Invalid parameters provided.', { symbol, interval, dataLength: data?.length });
      return;
    }
    const normalizedSymbol = symbol.toLowerCase();

    if (!candlestickDataStore.has(normalizedSymbol)) {
      candlestickDataStore.set(normalizedSymbol, new Map());
    }

    const symbolData = candlestickDataStore.get(normalizedSymbol);
    const config = CANDLESTICK_INTERVALS[interval];
    const maxCount = config ? config.maxCount : null;

    let finalData = data;
    if (maxCount && data.length > maxCount) {
      // Keep the most recent candlesticks
      finalData = data.slice(-maxCount);
      logger.debug(`CandlestickRepository.setCandlesticks: Trimmed ${data.length - finalData.length} old candles for ${normalizedSymbol} ${interval}.`);
    }
    
    symbolData.set(interval, finalData);
    logger.debug(`CandlestickRepository.setCandlesticks: Stored ${finalData.length} candlesticks for ${normalizedSymbol} ${interval}.`);
  }

  /**
   * Retrieves candlesticks for a given symbol and interval.
   * @param {string} symbol - The trading symbol.
   * @param {string} interval - The candlestick interval.
   * @returns {Candlestick[] | undefined} An array of candlesticks, or undefined if not found.
   */
  static getCandlesticks(symbol, interval) {
    if (!symbol || !interval) return undefined;
    const normalizedSymbol = symbol.toLowerCase();
    const symbolData = candlestickDataStore.get(normalizedSymbol);
    return symbolData ? symbolData.get(interval) : undefined;
  }

  /**
   * Retrieves the close price from N intervals ago for a specific symbol and interval.
   * @param {string} symbol - The trading symbol.
   * @param {string} interval - The base candlestick interval to use for lookup.
   * @param {number} intervalsAgo - The number of intervals to look back (0 means the most recent completed candle).
   * @returns {number | null} The close price, or null if not found or data is insufficient.
   */
  static getPriceNIntervalsAgo(symbol, interval, intervalsAgo) {
    if (!symbol || !interval || typeof intervalsAgo !== 'number' || intervalsAgo < 0) {
      logger.warn('CandlestickRepository.getPriceNIntervalsAgo: Invalid parameters.', { symbol, interval, intervalsAgo });
      return null;
    }
    const normalizedSymbol = symbol.toLowerCase();
    const intervalData = this.getCandlesticks(normalizedSymbol, interval);

    if (!intervalData || intervalData.length === 0) {
      logger.debug(`CandlestickRepository.getPriceNIntervalsAgo: No candlestick data for ${normalizedSymbol} ${interval}.`);
      return null;
    }

    // Target index: length - 1 is the most recent, length - 1 - N is N intervals ago.
    const targetIndex = intervalData.length - 1 - intervalsAgo;

    if (targetIndex < 0) {
      logger.debug(
        `CandlestickRepository.getPriceNIntervalsAgo: Not enough data for ${normalizedSymbol} ${interval}. Need ${intervalsAgo + 1} candles, have ${intervalData.length}. targetIndex: ${targetIndex}`
      );
      return null;
    }

    const candle = intervalData[targetIndex];
    if (candle && candle.close !== undefined) {
      const price = parseFloat(candle.close);
      logger.debug(
        `CandlestickRepository.getPriceNIntervalsAgo: Found price ${price} for ${normalizedSymbol} ${interval}, ${intervalsAgo} intervals ago at index ${targetIndex}.`
      );
      return price;
    }
    logger.warn(
      `CandlestickRepository.getPriceNIntervalsAgo: Candle or close price missing at targetIndex ${targetIndex} for ${normalizedSymbol} ${interval}.`
    );
    return null;
  }
  
  /**
   * Appends a single new candlestick to the existing data for a symbol and interval.
   * If the candlestick is marked as complete (kline.x === true in Binance terms),
   * it adds it and ensures the list does not exceed maxCount.
   * @param {string} symbol - The trading symbol.
   * @param {string} interval - The candlestick interval.
   * @param {Candlestick} newCandle - The new candlestick to add.
   * @param {boolean} isCandleComplete - Whether the candlestick is considered complete.
   */
  static appendCandlestick(symbol, interval, newCandle, isCandleComplete) {
    if (!isCandleComplete) {
      // logger.debug(`CandlestickRepository.appendCandlestick: Candle for ${symbol} ${interval} is not complete. Not appending.`);
      return; // Only append completed candles
    }

    if (!symbol || !interval || !newCandle) {
      logger.error('CandlestickRepository.appendCandlestick: Invalid parameters.', { symbol, interval, newCandle });
      return;
    }
    const normalizedSymbol = symbol.toLowerCase();

    let existingData = this.getCandlesticks(normalizedSymbol, interval);
    if (!existingData) {
      existingData = [];
    }

    // Add new candle. Assuming newCandle is more recent.
    const updatedData = [...existingData, newCandle];
    
    // Use setCandlesticks to handle trimming and storage
    this.setCandlesticks(normalizedSymbol, interval, updatedData);
    logger.debug(`CandlestickRepository.appendCandlestick: Appended candle for ${normalizedSymbol} ${interval}. New count: ${this.getCandlesticks(normalizedSymbol, interval)?.length}`);
  }

  /**
   * Retrieves a summary of all stored candlestick data.
   * @returns {object} An object summarizing the candlestick data.
   */
  static getSummary() {
    const summary = {};
    candlestickDataStore.forEach((intervalMap, symbol) => {
      summary[symbol] = {};
      intervalMap.forEach((data, interval) => {
        summary[symbol][interval] = {
          count: data.length,
          latestCloseTime: data.length > 0 ? new Date(data[data.length - 1].closeTime).toISOString() : null,
          oldestOpenTime: data.length > 0 ? new Date(data[0].openTime).toISOString() : null,
        };
      });
    });
    return summary;
  }

  /**
   * Clears all candlestick data from the store.
   * Useful for testing or resetting state.
   */
  static clearAll() {
    candlestickDataStore.clear();
    logger.info('CandlestickRepository.clearAll: All candlestick data cleared.');
  }
}

export default CandlestickRepository;
