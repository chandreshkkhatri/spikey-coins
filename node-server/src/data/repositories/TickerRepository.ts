/**
 * TickerRepository
 * Manages storage and retrieval of the latest ticker data.
 */
import logger from "../../utils/logger.js";
import { Ticker } from "../models/Ticker.js";

// Private store for the latest ticker data
// Array of Ticker objects
let latestTickerDataStore: Ticker[] = [];

class TickerRepository {
  /**
   * Updates the entire list of latest tickers.
   */
  static updateAllTickers(newData: Ticker[]): void {
    if (!Array.isArray(newData)) {
      logger.error(
        "TickerRepository.updateAllTickers: newData must be an array.",
        { type: typeof newData }
      );
      return;
    }
    latestTickerDataStore = newData;
    // logger.debug(`TickerRepository.updateAllTickers: Updated with ${newData.length} tickers.`);
  }

  /**
   * Retrieves the latest list of all tickers.
   */
  static getLatestTickers(): Ticker[] {
    return [...latestTickerDataStore]; // Return a copy to prevent direct modification
  }

  /**
   * Retrieves a specific ticker by its symbol.
   * Symbol matching is case-insensitive.
   */
  static getTickerBySymbol(symbol: string): Ticker | undefined {
    if (!symbol) return undefined;
    const normalizedSymbol = symbol.toUpperCase(); // Ticker symbols are typically uppercase from Binance
    return latestTickerDataStore.find(
      (ticker) =>
        ticker.symbol && ticker.symbol.toUpperCase() === normalizedSymbol
    );
  }

  /**
   * Clears all ticker data from the store.
   * Useful for testing or resetting state.
   */
  static clearAll(): void {
    latestTickerDataStore = [];
    logger.info("TickerRepository.clearAll: All ticker data cleared.");
  }
}

export default TickerRepository;
