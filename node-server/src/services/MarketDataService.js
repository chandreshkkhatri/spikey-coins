/**
 * MarketDataService
 * Responsible for enriching ticker data with market capitalization from CoinGecko,
 * calculated short-term changes, and other additional metrics.
 */
import TickerRepository from '../data/repositories/TickerRepository.js';
import PriceCalculationService from './PriceCalculationService.js';
import { calculateAdditionalMetrics } from '../../utils/calculations.js';
import logger from '../../utils/logger.js';

/**
 * @typedef {import('../external/CoinGeckoClient.js').CoinGeckoMarketData} CoinGeckoMarketData
 * @typedef {import('../data/models/Ticker.js').Ticker} Ticker
 */

class MarketDataService {
  /**
   * Processes raw ticker data from Binance, enriches it with market cap data,
   * calculated short-term changes, and other metrics, then updates the TickerRepository.
   *
   * @param {object[]} rawTickerArray - Array of raw ticker objects from Binance WebSocket.
   * @param {Map<string, CoinGeckoMarketData>} coingeckoDataMap - A map of CoinGecko market data, keyed by lowercase symbol.
   */
  static processAndStoreEnrichedTickers(rawTickerArray, coingeckoDataMap) {
    if (!Array.isArray(rawTickerArray)) {
      logger.error('MarketDataService.processAndStoreEnrichedTickers: rawTickerArray must be an array.');
      return;
    }
    if (!(coingeckoDataMap instanceof Map)) {
      logger.error('MarketDataService.processAndStoreEnrichedTickers: coingeckoDataMap must be a Map.');
      return;
    }

    logger.debug(`MarketDataService: Processing ${rawTickerArray.length} raw tickers.`);

    const enrichedTickers = rawTickerArray.map((rawTicker) => {
      if (!rawTicker || !rawTicker.s) {
        logger.warn('MarketDataService: Encountered a raw ticker without a symbol.', rawTicker);
        return null; // Skip this ticker if it's invalid
      }
      const symbol = rawTicker.s; // Binance symbol is uppercase, e.g., BTCUSDT
      const normalizedSymbol = symbol.toLowerCase(); // For lookups
      const currentPrice = parseFloat(rawTicker.c);

      if (isNaN(currentPrice)) {
        logger.warn(`MarketDataService: Current price for ${symbol} is NaN. Skipping short-term calculations.`, rawTicker);
        // Still process other metrics if possible
      }

      // 1. Calculate short-term changes
      const shortTermChanges = !isNaN(currentPrice) 
        ? PriceCalculationService.calculateAllShortTermChanges(symbol, currentPrice)
        : {}; // Empty object if price is NaN, will result in nulls for changes

      // 2. Get corresponding CoinGecko data
      const marketCapDataItem = coingeckoDataMap.get(normalizedSymbol);
      if (!marketCapDataItem) {
         // logger.debug(`MarketDataService: No CoinGecko market data found for ${normalizedSymbol}.`);
      }

      // 3. Calculate other additional metrics (volume in USD, range position, etc.)
      // The `calculateAdditionalMetrics` function expects the original Binance item and the CG item.
      const additionalMetrics = calculateAdditionalMetrics(rawTicker, marketCapDataItem);

      // 4. Combine all data into the Ticker structure
      /** @type {Ticker} */
      const tickerEntry = {
        ...rawTicker, // Spread raw Binance data first
        s: symbol, // Ensure symbol is explicitly set from rawTicker.s
        ...additionalMetrics, // Spread calculated metrics (price, volume_usd, etc.)
        ...shortTermChanges, // Spread calculated 1h, 4h, 8h, 12h changes
        // Add CoinGecko specific fields if available, ensure no clashes or use explicit mapping
        image: marketCapDataItem?.image,
        market_cap_rank: marketCapDataItem?.market_cap_rank,
        // fully_diluted_valuation, ath, atl etc. can be added if needed from marketCapDataItem
        last_updated: new Date().toISOString(),
      };
      return tickerEntry;
    }).filter(ticker => ticker !== null); // Remove any null entries from invalid raw tickers

    TickerRepository.updateAllTickers(enrichedTickers);
    logger.info(`MarketDataService: Updated TickerRepository with ${enrichedTickers.length} enriched tickers.`);
  }

  /**
   * Retrieves all tickers, already enriched, from the repository.
   * @returns {Ticker[]}
   */
  static getLatestEnrichedTickers() {
    return TickerRepository.getLatestTickers();
  }
}

export default MarketDataService;
