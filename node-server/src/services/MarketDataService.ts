/**
 * MarketDataService
 * Responsible for enriching ticker data with calculated short-term changes and additional metrics.
 */
import TickerRepository from "../data/repositories/TickerRepository.js";
import PriceCalculationService, {
  type ShortTermChanges,
} from "./PriceCalculationService.js";
import { calculateAdditionalMetrics } from "../utils/calculations.js";
import logger from "../utils/logger.js";
import type { Ticker } from "../data/models/Ticker.js";

interface RawBinanceTicker {
  s: string; // symbol
  c: string; // current price
  h: string; // high price
  l: string; // low price
  v: string; // volume
  P: string; // price change percent
  p: string; // price change value
  [key: string]: any; // other properties from Binance ticker
}

class MarketDataService {
  /**
   * Processes raw ticker data from Binance, enriches it with calculated short-term changes
   * and other metrics, then updates the TickerRepository.
   *
   * @param rawTickerArray - Array of raw ticker objects from Binance WebSocket.
   */
  static processAndStoreEnrichedTickers(
    rawTickerArray: RawBinanceTicker[]
  ): void {
    if (!Array.isArray(rawTickerArray)) {
      logger.error(
        "MarketDataService.processAndStoreEnrichedTickers: rawTickerArray must be an array."
      );
      return;
    }

    logger.debug(
      `MarketDataService: Processing ${rawTickerArray.length} raw tickers.`
    );

    const enrichedTickers = rawTickerArray
      .map((rawTicker): Ticker | null => {
        if (!rawTicker || !rawTicker.s) {
          logger.warn(
            "MarketDataService: Encountered a raw ticker without a symbol.",
            rawTicker
          );
          return null; // Skip this ticker if it's invalid
        }
        const symbol = rawTicker.s; // Binance symbol is uppercase, e.g., BTCUSDT
        const currentPrice = parseFloat(rawTicker.c);

        if (isNaN(currentPrice)) {
          logger.warn(
            `MarketDataService: Current price for ${symbol} is NaN. Skipping short-term calculations.`,
            rawTicker
          );
          // Still process other metrics if possible
        }

        // 1. Calculate short-term changes
        const shortTermChanges: Partial<ShortTermChanges> = !isNaN(currentPrice)
          ? PriceCalculationService.calculateAllShortTermChanges(
              symbol,
              currentPrice
            ) || {}
          : {}; // Empty object if price is NaN, will result in nulls for changes

        // 2. Calculate other additional metrics (volume in USD, range position, etc.)
        const additionalMetrics = calculateAdditionalMetrics(rawTicker);

        // 3. Combine all data into the Ticker structure
        const tickerEntry: Ticker = {
          // Map raw Binance ticker properties to Ticker interface properties
          symbol: symbol,
          lastPrice: rawTicker.c,
          priceChange: rawTicker.p,
          priceChangePercent: rawTicker.P,
          highPrice: rawTicker.h,
          lowPrice: rawTicker.l,
          volume: rawTicker.v,
          quoteVolume: rawTicker.q || "0", // fallback if not present
          openTime: rawTicker.O || 0, // fallback if not present
          closeTime: rawTicker.C || 0, // fallback if not present
          firstId: rawTicker.F || 0, // fallback if not present
          lastId: rawTicker.L || 0, // fallback if not present
          count: rawTicker.n || 0, // fallback if not present
          ...additionalMetrics, // Spread calculated metrics (price, volume_usd, etc.)
          ...shortTermChanges, // Spread calculated 1h, 4h, 8h, 12h changes
          // Additional properties for backward compatibility with tests
          s: symbol, // Alternative symbol property
          change_24h: additionalMetrics.price_change_24h_percent, // Alternative 24h change property
          last_updated: new Date().toISOString(),
        };
        return tickerEntry;
      })
      .filter((ticker): ticker is Ticker => ticker !== null); // Remove any null entries from invalid raw tickers

    TickerRepository.updateAllTickers(enrichedTickers);
    logger.info(
      `MarketDataService: Updated TickerRepository with ${enrichedTickers.length} enriched tickers.`
    );
  }


}

export default MarketDataService;
