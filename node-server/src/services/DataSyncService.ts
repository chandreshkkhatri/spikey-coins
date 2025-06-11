/**
 * DataSyncService
 * Orchestrates the initial fetching of historical data.
 */
import BinanceClient from "../external/BinanceClient.js";
import CandlestickRepository from "../data/repositories/CandlestickRepository.js";
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
   * Initializes historical candlestick data on application startup.
   * - Fetches historical candlesticks for major pairs and defined intervals from Binance.
   */
  static async initializeHistoricalData(): Promise<void> {
    logger.info("DataSyncService: Starting historical data initialization...");

    // Small delay before starting to allow other services (like logger) to fully initialize
    await new Promise((resolve) =>
      setTimeout(resolve, HISTORICAL_DATA_INIT_DELAY)
    );

    try {
      // Fetch and store historical candlestick data from Binance
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
}

export default DataSyncService;
