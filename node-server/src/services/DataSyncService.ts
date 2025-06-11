/**
 * DataSyncService
 * Orchestrates the initial fetching and persistent storage of historical data.
 * Enhanced with file-based storage and batch processing for improved performance.
 */
import BinanceClient from "../external/BinanceClient.js";
import CandlestickRepository from "../data/repositories/CandlestickRepository.js";
import CandlestickStorageService from "./CandlestickStorageService.js";
import {
  MAJOR_PAIRS,
  CANDLESTICK_INTERVALS,
  DELAY_BETWEEN_REQUESTS,
  HISTORICAL_DATA_INIT_DELAY,
  BATCH_SIZE_STORAGE,
  CANDLESTICK_UPDATE_INTERVAL_MINUTES,
  type CandlestickIntervalConfig,
} from "../config/constants.js";
import logger from "../utils/logger.js";

class DataSyncService {
  private static updateInterval: NodeJS.Timeout | null = null;

  /**
   * Initializes historical candlestick data on application startup.
   * - Loads from persistent storage first, then fetches missing data from Binance.
   * - Sets up periodic updates to keep data fresh.
   */
  static async initializeHistoricalData(): Promise<void> {
    logger.info("DataSyncService: Starting enhanced historical data initialization...");

    // Small delay before starting to allow other services to fully initialize
    await new Promise((resolve) =>
      setTimeout(resolve, HISTORICAL_DATA_INIT_DELAY)
    );

    try {
      // Initialize storage service
      await CandlestickStorageService.initialize();

      // Step 1: Load existing data from persistent storage
      logger.info("DataSyncService: Loading candlestick data from persistent storage...");
      const storedData = await CandlestickStorageService.loadAllCandlestickData();
      
      // Load stored data into memory repository
      let loadedSymbolsCount = 0;
      for (const [symbol, intervalData] of storedData.entries()) {
        for (const [interval, candlesticks] of Object.entries(intervalData)) {
          CandlestickRepository.setCandlesticks(symbol, interval, candlesticks);
        }
        loadedSymbolsCount++;
      }
      
      if (loadedSymbolsCount > 0) {
        logger.info(`DataSyncService: Loaded existing data for ${loadedSymbolsCount} symbols from storage`);
      }

      // Step 2: Fetch missing or outdated data from Binance (batch processing)
      logger.info("DataSyncService: Fetching updated candlestick data from Binance...");
      const intervals = Object.keys(CANDLESTICK_INTERVALS) as (keyof typeof CANDLESTICK_INTERVALS)[];
      const symbolsToUpdate = [...MAJOR_PAIRS]; // Copy to avoid mutation
      
      // Process symbols in batches to manage API rate limits
      for (let i = 0; i < symbolsToUpdate.length; i += BATCH_SIZE_STORAGE) {
        const batch = symbolsToUpdate.slice(i, i + BATCH_SIZE_STORAGE);
        logger.debug(`DataSyncService: Processing batch ${Math.floor(i / BATCH_SIZE_STORAGE) + 1}/${Math.ceil(symbolsToUpdate.length / BATCH_SIZE_STORAGE)}`);
        
        await this.processBatch(batch, intervals);
        
        // Longer delay between batches to be respectful of API limits
        if (i + BATCH_SIZE_STORAGE < symbolsToUpdate.length) {
          await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_REQUESTS * 5));
        }
      }

      // Step 3: Save updated data to persistent storage
      logger.info("DataSyncService: Saving updated data to persistent storage...");
      const repositoryData = new Map<string, Record<string, any>>();
      const summary = CandlestickRepository.getSummary();
      
      for (const [symbol, intervalSummary] of Object.entries(summary)) {
        const symbolData: Record<string, any> = {};
        for (const interval of intervals) {
          const candlesticks = CandlestickRepository.getCandlesticks(symbol, interval);
          if (candlesticks) {
            symbolData[interval] = candlesticks;
          }
        }
        if (Object.keys(symbolData).length > 0) {
          repositoryData.set(symbol, symbolData);
        }
      }
      
      await CandlestickStorageService.saveAllCandlestickData(repositoryData);

      // Step 4: Set up periodic updates
      this.setupPeriodicUpdates();

      logger.info("DataSyncService: Enhanced historical data initialization completed successfully");
      logger.info("Final candlestick data summary:", CandlestickRepository.getSummary());
      
    } catch (error) {
      logger.error(
        `DataSyncService: Critical error during enhanced historical data initialization: ${
          (error as Error).message
        }`,
        error
      );
      throw error;
    }
  }

  /**
   * Process a batch of symbols to fetch historical data
   */
  private static async processBatch(
    symbols: string[], 
    intervals: string[]
  ): Promise<void> {
    for (const symbol of symbols) {
      logger.debug(`DataSyncService: Processing ${symbol}...`);
      
      for (const interval of intervals) {
        const config: CandlestickIntervalConfig | undefined = CANDLESTICK_INTERVALS[interval];
        if (!config) {
          logger.warn(`DataSyncService: No configuration found for interval ${interval}. Skipping.`);
          continue;
        }

        try {
          const historicalCandles = await BinanceClient.fetchHistoricalCandlesticks(
            symbol, // Pass uppercase symbol to client
            interval,
            config.maxCount
          );

          if (historicalCandles && historicalCandles.length > 0) {
            CandlestickRepository.setCandlesticks(
              symbol.toLowerCase(),
              interval,
              historicalCandles
            );
            logger.debug(
              `DataSyncService: Updated ${historicalCandles.length} ${interval} candlesticks for ${symbol}`
            );
          } else {
            logger.warn(`DataSyncService: No data received for ${symbol} ${interval}`);
          }
        } catch (error) {
          logger.error(
            `DataSyncService: Error fetching data for ${symbol} ${interval}: ${(error as Error).message}`
          );
        }

        // Delay between API calls within the same symbol
        await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
      }
    }
  }

  /**
   * Set up periodic updates to keep data fresh
   */
  private static setupPeriodicUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    const updateIntervalMs = CANDLESTICK_UPDATE_INTERVAL_MINUTES * 60 * 1000;
    this.updateInterval = setInterval(async () => {
      try {
        logger.info("DataSyncService: Starting periodic update...");
        await this.performPeriodicUpdate();
        logger.info("DataSyncService: Periodic update completed");
      } catch (error) {
        logger.error("DataSyncService: Error during periodic update", error);
      }
    }, updateIntervalMs);

    logger.info(`DataSyncService: Set up periodic updates every ${CANDLESTICK_UPDATE_INTERVAL_MINUTES} minutes`);
  }

  /**
   * Perform periodic update of candlestick data
   */
  private static async performPeriodicUpdate(): Promise<void> {
    try {
      // Update a subset of symbols to balance freshness with API limits
      const intervals = Object.keys(CANDLESTICK_INTERVALS) as (keyof typeof CANDLESTICK_INTERVALS)[];
      const symbolsToUpdate = MAJOR_PAIRS.slice(0, 20); // Update top 20 symbols more frequently
      
      await this.processBatch(symbolsToUpdate, intervals);
      
      // Save updated data
      const repositoryData = new Map<string, Record<string, any>>();
      const summary = CandlestickRepository.getSummary();
      
      for (const [symbol, intervalSummary] of Object.entries(summary)) {
        const symbolData: Record<string, any> = {};
        for (const interval of intervals) {
          const candlesticks = CandlestickRepository.getCandlesticks(symbol, interval);
          if (candlesticks) {
            symbolData[interval] = candlesticks;
          }
        }
        if (Object.keys(symbolData).length > 0) {
          repositoryData.set(symbol, symbolData);
        }
      }
      
      await CandlestickStorageService.saveAllCandlestickData(repositoryData);
      
    } catch (error) {
      logger.error("DataSyncService: Error in periodic update", error);
      throw error;
    }
  }

  /**
   * Cleanup method to clear intervals
   */
  static cleanup(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      logger.info("DataSyncService: Cleaned up periodic update interval");
    }
  }
}

export default DataSyncService;
