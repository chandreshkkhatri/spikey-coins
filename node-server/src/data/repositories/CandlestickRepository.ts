/**
 * CandlestickRepository
 * Manages storage and retrieval of candlestick data.
 */
import logger from "../../utils/logger.js";
import { CANDLESTICK_INTERVALS } from "../../config/constants.js";
import { Candlestick } from "../models/Candlestick.js";

// Private store for candlestick data
// Structure: Map<string_lowercase_symbol, Map<string_interval, Candlestick[]>>
const candlestickDataStore = new Map<string, Map<string, Candlestick[]>>();

class CandlestickRepository {
  /**
   * Stores an array of candlesticks for a given symbol and interval.
   * Ensures the symbol is stored in lowercase for consistency.
   * Trims the data to the maxCount defined in CANDLESTICK_INTERVALS.
   */
  static setCandlesticks(
    symbol: string,
    interval: string,
    data: Candlestick[]
  ): void {
    if (!symbol || !interval || !Array.isArray(data)) {
      logger.error(
        "CandlestickRepository.setCandlesticks: Invalid parameters provided.",
        { symbol, interval, dataLength: data?.length }
      );
      return;
    }
    const normalizedSymbol = symbol.toLowerCase();

    if (!candlestickDataStore.has(normalizedSymbol)) {
      candlestickDataStore.set(normalizedSymbol, new Map());
    }

    const symbolData = candlestickDataStore.get(normalizedSymbol)!;
    const config = CANDLESTICK_INTERVALS[interval];
    const maxCount = config ? config.maxCount : null;

    let finalData = data;
    if (maxCount && data.length > maxCount) {
      // Keep the most recent candlesticks
      finalData = data.slice(-maxCount);
      logger.debug(
        `CandlestickRepository.setCandlesticks: Trimmed ${
          data.length - finalData.length
        } old candles for ${normalizedSymbol} ${interval}.`
      );
    }

    symbolData.set(interval, finalData);
    logger.debug(
      `CandlestickRepository.setCandlesticks: Stored ${finalData.length} candlesticks for ${normalizedSymbol} ${interval}.`
    );
  }

  /**
   * Retrieves candlesticks for a given symbol and interval.
   */
  static getCandlesticks(
    symbol: string,
    interval: string
  ): Candlestick[] | undefined {
    if (!symbol || !interval) return undefined;
    const normalizedSymbol = symbol.toLowerCase();
    const symbolData = candlestickDataStore.get(normalizedSymbol);
    return symbolData ? symbolData.get(interval) : undefined;
  }

  /**
   * Retrieves the close price from N intervals ago for a specific symbol and interval.
   */
  static getPriceNIntervalsAgo(
    symbol: string,
    interval: string,
    intervalsAgo: number
  ): number | null {
    if (
      !symbol ||
      !interval ||
      typeof intervalsAgo !== "number" ||
      intervalsAgo < 0
    ) {
      logger.warn(
        "CandlestickRepository.getPriceNIntervalsAgo: Invalid parameters.",
        { symbol, interval, intervalsAgo }
      );
      return null;
    }
    const normalizedSymbol = symbol.toLowerCase();
    const intervalData = this.getCandlesticks(normalizedSymbol, interval);

    if (!intervalData || intervalData.length === 0) {
      logger.debug(
        `CandlestickRepository.getPriceNIntervalsAgo: No candlestick data for ${normalizedSymbol} ${interval}.`
      );
      return null;
    }

    // Target index: length - 1 is the most recent, length - 1 - N is N intervals ago.
    const targetIndex = intervalData.length - 1 - intervalsAgo;

    if (targetIndex < 0) {
      logger.debug(
        `CandlestickRepository.getPriceNIntervalsAgo: Not enough data for ${normalizedSymbol} ${interval}. Need ${
          intervalsAgo + 1
        } candles, have ${intervalData.length}. targetIndex: ${targetIndex}`
      );
      return null;
    }

    const candle = intervalData[targetIndex];
    if (candle && candle.close !== undefined) {
      const price = parseFloat(candle.close.toString());
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
   */
  static appendCandlestick(
    symbol: string,
    interval: string,
    newCandle: Candlestick
  ): void {
    if (!newCandle.isClosed) {
      // Only append completed candles
      return;
    }

    if (!symbol || !interval || !newCandle) {
      logger.error(
        "CandlestickRepository.appendCandlestick: Invalid parameters.",
        { symbol, interval, newCandle }
      );
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
    logger.debug(
      `CandlestickRepository.appendCandlestick: Appended candle for ${normalizedSymbol} ${interval}. New count: ${
        this.getCandlesticks(normalizedSymbol, interval)?.length
      }`
    );
  }

  /**
   * Retrieves a summary of all stored candlestick data.
   */
  static getSummary(): Record<
    string,
    Record<
      string,
      {
        count: number;
        latestCloseTime: string | null;
        oldestOpenTime: string | null;
      }
    >
  > {
    const summary: Record<
      string,
      Record<
        string,
        {
          count: number;
          latestCloseTime: string | null;
          oldestOpenTime: string | null;
        }
      >
    > = {};
    candlestickDataStore.forEach((intervalMap, symbol) => {
      summary[symbol] = {};
      intervalMap.forEach((data, interval) => {
        summary[symbol][interval] = {
          count: data.length,
          latestCloseTime:
            data.length > 0
              ? new Date(data[data.length - 1].closeTime).toISOString()
              : null,
          oldestOpenTime:
            data.length > 0 ? new Date(data[0].openTime).toISOString() : null,
        };
      });
    });
    return summary;
  }

  /**
   * Clears all candlestick data from the store.
   * Useful for testing or resetting state.
   */
  static clearAll(): void {
    candlestickDataStore.clear();
    logger.info(
      "CandlestickRepository.clearAll: All candlestick data cleared."
    );
  }
}

export default CandlestickRepository;
