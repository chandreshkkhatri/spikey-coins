/**
 * DataSyncService
 * Orchestrates the initial fetching of historical data and ongoing synchronization.
 */
import BinanceClient from '../external/BinanceClient.js';
import CoinGeckoClient from '../external/CoinGeckoClient.js';
import CandlestickRepository from '../data/repositories/CandlestickRepository.js';
import TickerRepository from '../data/repositories/TickerRepository.js'; // Ticker repo might not be directly used here for init
import MarketDataService from './MarketDataService.js'; // To potentially trigger an initial processing if needed
import { MAJOR_PAIRS, CANDLESTICK_INTERVALS, DELAY_BETWEEN_REQUESTS, HISTORICAL_DATA_INIT_DELAY, COINGECKO_REFRESH_INTERVAL_MS } from '../../config/constants.js'; // Added COINGECKO_REFRESH_INTERVAL_MS
import logger from '../../utils/logger.js';

/**
 * @typedef {import('../external/CoinGeckoClient.js').CoinGeckoMarketData} CoinGeckoMarketData
 */

class DataSyncService {
  /** @type {Map<string, CoinGeckoMarketData>} */
  static latestCoinGeckoDataMap = new Map();
  /** @type {NodeJS.Timeout | null} */
  static coinGeckoRefreshIntervalId = null;

  /**
   * Initializes all necessary historical data on application startup.
   * - Fetches historical candlesticks for major pairs and defined intervals from Binance.
   * - Fetches initial market capitalization data from CoinGecko and starts periodic refresh.
   */
  static async initializeHistoricalData() {
    logger.info('DataSyncService: Starting historical data initialization...');
    
    // Small delay before starting to allow other services (like logger) to fully initialize
    await new Promise(resolve => setTimeout(resolve, HISTORICAL_DATA_INIT_DELAY));

    try {
      // 1. Fetch and store historical candlestick data from Binance
      logger.info('DataSyncService: Initializing historical candlestick data from Binance...');
      const intervals = Object.keys(CANDLESTICK_INTERVALS);

      for (const symbol of MAJOR_PAIRS) { // MAJOR_PAIRS are uppercase, e.g., BTCUSDT
        logger.debug(`DataSyncService: Initializing data for ${symbol}.`);
        for (const interval of intervals) {
          const config = CANDLESTICK_INTERVALS[interval];
          if (!config) {
            logger.warn(`DataSyncService: No configuration found for interval ${interval} for symbol ${symbol}. Skipping.`);
            continue;
          }

          try {
            // BinanceClient.fetchHistoricalCandlesticks handles its own rate limiting check before making a call
            const historicalCandles = await BinanceClient.fetchHistoricalCandlesticks(
              symbol, // Pass uppercase symbol to client
              interval,
              config.maxCount
            );

            if (historicalCandles && historicalCandles.length > 0) {
              // CandlestickRepository.setCandlesticks expects lowercase symbol
              CandlestickRepository.setCandlesticks(symbol.toLowerCase(), interval, historicalCandles);
              logger.info(
                `DataSyncService: Stored ${historicalCandles.length} ${interval} candlesticks for ${symbol}.`
              );
            } else {
              logger.warn(
                `DataSyncService: No historical candlestick data received or stored for ${symbol} ${interval}.`
              );
            }
          } catch (error) {
            logger.error(
              `DataSyncService: Error fetching/storing candlestick data for ${symbol} ${interval}: ${error.message}`,
              error
            );
          }
          // Add a small delay between each distinct API call if not handled by the client's rate limiter
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS / 2)); // Shorter delay as client also has checks
        }
      }
      logger.info('DataSyncService: Historical candlestick data initialization attempt completed.');
      logger.info('Candlestick data summary after init:', CandlestickRepository.getSummary());

      // 2. Fetch initial CoinGecko data and start periodic refresh
      logger.info('DataSyncService: Fetching initial market data from CoinGecko and starting periodic refresh...');
      await DataSyncService.fetchAndStoreCoinGeckoData(); // Initial fetch
      
      if (DataSyncService.coinGeckoRefreshIntervalId) {
        clearInterval(DataSyncService.coinGeckoRefreshIntervalId);
      }
      DataSyncService.coinGeckoRefreshIntervalId = setInterval(async () => {
        logger.info('DataSyncService: Periodically refreshing CoinGecko data...');
        await DataSyncService.fetchAndStoreCoinGeckoData();
      }, COINGECKO_REFRESH_INTERVAL_MS);
      logger.info(`DataSyncService: CoinGecko data refresh scheduled every ${COINGECKO_REFRESH_INTERVAL_MS / 1000 / 60} minutes.`);

    } catch (error) {
      logger.error(`DataSyncService: Critical error during historical data initialization: ${error.message}`, error);
    }
    logger.info('DataSyncService: Historical data initialization process finished.');
  }

  /**
   * Fetches current market data from CoinGecko and stores it in `latestCoinGeckoDataMap`.
   * @returns {Promise<void>}
   */
  static async fetchAndStoreCoinGeckoData() {
    logger.debug('DataSyncService: Attempting to fetch and store CoinGecko data...');
    const marketDataArray = await CoinGeckoClient.fetchMarketData();
    if (marketDataArray) {
      const newMap = new Map();
      marketDataArray.forEach(item => {
        if (item && item.symbol) {
          newMap.set(item.symbol.toLowerCase(), item);
        }
      });
      DataSyncService.latestCoinGeckoDataMap = newMap;
      logger.info(`DataSyncService: Successfully fetched and stored/updated CoinGecko data for ${newMap.size} symbols.`);
    } else {
      logger.warn('DataSyncService: Could not fetch or update CoinGecko market data in the latest attempt.');
    }
  }

  /**
   * Returns the most recently fetched CoinGecko data map.
   * Does not trigger a new fetch; relies on periodic updates or manual refresh.
   * @returns {Promise<Map<string, CoinGeckoMarketData>>} A promise that resolves to the map.
   */
  static async getCurrentCoinGeckoDataMap() {
    // This method now returns the cached map.
    // It's a Promise to maintain consistency with its previous async nature,
    // though it could be made synchronous if no async operations are ever added here.
    if (DataSyncService.latestCoinGeckoDataMap.size === 0) {
        logger.warn("DataSyncService: getCurrentCoinGeckoDataMap called, but map is empty. Initial fetch might be pending or failed.");
        // Depending on requirements, an ad-hoc fetch could be triggered here if the map is empty.
        // await DataSyncService.fetchAndStoreCoinGeckoData(); // Uncomment if an on-demand fetch is desired when empty
    }
    logger.debug(`DataSyncService: Providing current CoinGecko data map with ${DataSyncService.latestCoinGeckoDataMap.size} entries.`);
    return DataSyncService.latestCoinGeckoDataMap;
  }

  /**
   * Stops the periodic refresh of CoinGecko data.
   */
  static stopCoinGeckoRefresh() {
    if (DataSyncService.coinGeckoRefreshIntervalId) {
      clearInterval(DataSyncService.coinGeckoRefreshIntervalId);
      DataSyncService.coinGeckoRefreshIntervalId = null;
      logger.info('DataSyncService: Stopped periodic CoinGecko data refresh.');
    }
  }
}

export default DataSyncService;
