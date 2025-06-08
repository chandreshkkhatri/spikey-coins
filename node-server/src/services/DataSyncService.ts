/**
 * DataSyncService
 * Orchestrates the initial fetching of historical data and ongoing synchronization.
 */
import BinanceClient from "../external/BinanceClient.js";
import CoinGeckoClient, {
  type CoinGeckoMarketData,
} from "../external/CoinGeckoClient.js";
import CandlestickRepository from "../data/repositories/CandlestickRepository.js";
import TickerRepository from "../data/repositories/TickerRepository.js"; // Ticker repo might not be directly used here for init
import MarketDataService from "./MarketDataService.js"; // To potentially trigger an initial processing if needed
import {
  MAJOR_PAIRS,
  CANDLESTICK_INTERVALS,
  DELAY_BETWEEN_REQUESTS,
  HISTORICAL_DATA_INIT_DELAY,
  type CandlestickIntervalConfig,
} from "../config/constants.js";
import logger from "../utils/logger.js";

class DataSyncService {
  /**
   * Initializes all necessary historical data on application startup.
   * - Fetches historical candlesticks for major pairs and defined intervals from Binance.
   * - Fetches market capitalization data from CoinGecko.
   */
  static async initializeHistoricalData(): Promise<void> {
    logger.info("DataSyncService: Starting historical data initialization...");

    // Small delay before starting to allow other services (like logger) to fully initialize
    await new Promise((resolve) =>
      setTimeout(resolve, HISTORICAL_DATA_INIT_DELAY)
    );

    try {
      // 1. Fetch and store historical candlestick data from Binance
      logger.info(
        "DataSyncService: Initializing historical candlestick data from Binance..."
      );
      const intervals = Object.keys(
        CANDLESTICK_INTERVALS
      ) as (keyof typeof CANDLESTICK_INTERVALS)[];

      for (const symbol of MAJOR_PAIRS) {
        // MAJOR_PAIRS are uppercase, e.g., BTCUSDT
        logger.debug(`DataSyncService: Initializing data for ${symbol}.`);
        for (const interval of intervals) {
          const config: CandlestickIntervalConfig | undefined =
            CANDLESTICK_INTERVALS[interval];
          if (!config) {
            logger.warn(
              `DataSyncService: No configuration found for interval ${interval} for symbol ${symbol}. Skipping.`
            );
            continue;
          }

          try {
            // BinanceClient.fetchHistoricalCandlesticks handles its own rate limiting check before making a call
            const historicalCandles =
              await BinanceClient.fetchHistoricalCandlesticks(
                symbol, // Pass uppercase symbol to client
                interval,
                config.maxCount
              );

            if (historicalCandles && historicalCandles.length > 0) {
              // CandlestickRepository.setCandlesticks expects lowercase symbol
              CandlestickRepository.setCandlesticks(
                symbol.toLowerCase(),
                interval,
                historicalCandles
              );
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
              `DataSyncService: Error fetching/storing candlestick data for ${symbol} ${interval}: ${
                (error as Error).message
              }`,
              error
            );
          }
          // Add a small delay between each distinct API call if not handled by the client's rate limiter
          await new Promise((resolve) =>
            setTimeout(resolve, DELAY_BETWEEN_REQUESTS / 2)
          ); // Shorter delay as client also has checks
        }
      }
      logger.info(
        "DataSyncService: Historical candlestick data initialization attempt completed."
      );
      logger.info(
        "Candlestick data summary after init:",
        CandlestickRepository.getSummary()
      );

      // 2. Fetch and potentially store/cache market cap data from CoinGecko
      // This data is usually fetched and then passed to MarketDataService when processing live tickers.
      // For now, we'll just log that it would be fetched. The actual fetch might be better timed
      // with the first ticker updates or on a separate schedule.
      logger.info(
        "DataSyncService: Fetching initial market data from CoinGecko (if needed for immediate use)..."
      );
      const marketData = await CoinGeckoClient.fetchMarketData();
      if (marketData) {
        logger.info(
          `DataSyncService: Successfully fetched initial market data for ${marketData.length} coins from CoinGecko.`
        );
        // Storing this globally or making it available to MarketDataService is key.
        // For now, let's assume MarketDataService will fetch it or have it passed when processing live data.
        // Or, we can pre-process existing tickers if any were loaded from a persistence layer (not in current scope).
      } else {
        logger.warn(
          "DataSyncService: Could not fetch initial market data from CoinGecko."
        );
      }
    } catch (error) {
      logger.error(
        `DataSyncService: Critical error during historical data initialization: ${
          (error as Error).message
        }`,
        error
      );
    }
    logger.info(
      "DataSyncService: Historical data initialization process finished."
    );
  }

  /**
   * Fetches current market data from CoinGecko and returns it as a Map keyed by lowercase symbol.
   * This is intended to be called periodically or before processing a batch of ticker updates.
   * @returns A Map of CoinGecko market data keyed by lowercase symbol
   */
  static async getCurrentCoinGeckoDataMap(): Promise<
    Map<string, CoinGeckoMarketData>
  > {
    const marketDataArray = await CoinGeckoClient.fetchMarketData();
    const coingeckoDataMap = new Map<string, CoinGeckoMarketData>();
    if (marketDataArray) {
      marketDataArray.forEach((item) => {
        if (item && item.symbol) {
          coingeckoDataMap.set(item.symbol.toLowerCase(), item);
        }
      });
    }
    logger.debug(
      `DataSyncService: Prepared CoinGecko data map with ${coingeckoDataMap.size} entries.`
    );
    return coingeckoDataMap;
  }
}

export default DataSyncService;
