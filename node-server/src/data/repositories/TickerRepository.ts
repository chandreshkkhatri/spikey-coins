/**
 * TickerRepository
 * Manages storage and retrieval of the latest ticker data.
 */
import { Ticker } from "../../data/models/Ticker.js";
import logger from "../../utils/logger.js";

// Expiry time for tickers in milliseconds (e.g., 30 minutes)
const TICKER_EXPIRY_MS = 30 * 60 * 1000;
const PRUNE_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

interface TickerCacheEntry {
  ticker: Ticker;
  lastUpdated: number;
}

const tickerDataStore = new Map<string, TickerCacheEntry>();

/**
 * Prunes expired tickers from the data store.
 */
function pruneExpiredTickers(): void {
  const now = Date.now();
  let prunedCount = 0;
  for (const [symbol, entry] of tickerDataStore.entries()) {
    if (now - entry.lastUpdated > TICKER_EXPIRY_MS) {
      tickerDataStore.delete(symbol);
      prunedCount++;
    }
  }
  if (prunedCount > 0) {
    logger.info(`Pruned ${prunedCount} expired tickers from the repository.`);
  }
}

// Periodically prune expired tickers
setInterval(pruneExpiredTickers, PRUNE_INTERVAL_MS);

class TickerRepository {
  /**
   * Updates or inserts multiple tickers.
   * This prevents the ticker list from shrinking due to stream fluctuations.
   * @param tickers - An array of enriched ticker data.
   */
  static upsertTickers(tickers: Ticker[]): void {
    const now = Date.now();
    for (const ticker of tickers) {
      if (ticker && ticker.symbol) {
        tickerDataStore.set(ticker.symbol, {
          ticker,
          lastUpdated: now,
        });
      }
    }
  }

  static getTicker(symbol: string): Ticker | undefined {
    const entry = tickerDataStore.get(symbol);
    return entry?.ticker;
  }

  static getAllTickers(): Ticker[] {
    // Return the tickers from the cache entries
    return Array.from(tickerDataStore.values()).map((entry) => entry.ticker);
  }

  static getTickerCount(): number {
    return tickerDataStore.size;
  }

  static clearAll(): void {
    tickerDataStore.clear();
    logger.info("TickerRepository has been cleared.");
  }
}

export default TickerRepository;
