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
  INITIAL_LOAD_BATCH_SIZE,
  PERIODIC_UPDATE_BATCH_SIZE,
  type CandlestickIntervalConfig,
} from "../config/constants.js";
import SymbolDiscoveryService from "./SymbolDiscoveryService.js";
import logger from "../utils/logger.js";

class DataSyncService {
  private static updateInterval: NodeJS.Timeout | null = null;

  /**
   * Initializes historical candlestick data on application startup.
   * - Loads from persistent storage first, then fetches missing data from Binance.
   * - Sets up periodic updates to keep data fresh.
   */
  static async initializeHistoricalData(): Promise<void> {
    logger.info(
      "DataSyncService: Starting enhanced historical data initialization..."
    );

    // Small delay before starting to allow other services to fully initialize
    await new Promise((resolve) =>
      setTimeout(resolve, HISTORICAL_DATA_INIT_DELAY)
    );

    try {
      // Initialize storage service
      await CandlestickStorageService.initialize();

      // Step 1: Load existing data from persistent storage
      logger.info(
        "DataSyncService: Loading candlestick data from persistent storage..."
      );
      const storedData =
        await CandlestickStorageService.loadAllCandlestickData();

      // Load stored data into memory repository
      let loadedSymbolsCount = 0;
      for (const [symbol, intervalData] of storedData.entries()) {
        for (const [interval, candlesticks] of Object.entries(intervalData)) {
          CandlestickRepository.setCandlesticks(symbol, interval, candlesticks);
        }
        loadedSymbolsCount++;
      }

      if (loadedSymbolsCount > 0) {
        logger.info(
          `DataSyncService: Loaded existing data for ${loadedSymbolsCount} symbols from storage`
        );
      }

      // Step 2: Wait for WebSocket to populate symbols, then fetch candlestick data
      logger.info(
        "DataSyncService: Waiting for WebSocket to discover trading symbols..."
      );

      // Wait up to 30 seconds for symbols to be discovered from WebSocket
      let discoveredSymbols: string[] = [];
      const maxWaitTime = 30000; // 30 seconds
      const checkInterval = 2000; // Check every 2 seconds
      let elapsedTime = 0;

      while (discoveredSymbols.length === 0 && elapsedTime < maxWaitTime) {
        discoveredSymbols = SymbolDiscoveryService.getTopSymbolsByVolume(200); // Get more symbols
        if (discoveredSymbols.length > 0) {
          logger.info(
            `DataSyncService: Discovered ${discoveredSymbols.length} symbols from WebSocket after ${elapsedTime}ms`
          );
          break;
        }
        logger.debug(
          `DataSyncService: Waiting for symbol discovery... (${elapsedTime}ms elapsed)`
        );
        await new Promise((resolve) => setTimeout(resolve, checkInterval));
        elapsedTime += checkInterval;
      }

      // Use only valid discovered symbols, or fallback to a minimal safe list
      const safeStaticSymbols = [
        "BTCUSDT",
        "ETHUSDT",
        "BNBUSDT",
        "ADAUSDT",
        "SOLUSDT",
        "XRPUSDT",
        "DOTUSDT",
        "DOGEUSDT",
        "AVAXUSDT",
        "MATICUSDT",
      ];

      const finalSymbolsToUpdate =
        discoveredSymbols.length > 0 ? discoveredSymbols : safeStaticSymbols;
      const intervals = Object.keys(
        CANDLESTICK_INTERVALS
      ) as (keyof typeof CANDLESTICK_INTERVALS)[];

      logger.info(
        `DataSyncService: Using ${
          discoveredSymbols.length > 0 ? "discovered" : "safe static"
        } symbols for initialization`
      );

      const batchSize = INITIAL_LOAD_BATCH_SIZE;
      const totalBatches = Math.ceil(finalSymbolsToUpdate.length / batchSize);

      const symbolSource =
        discoveredSymbols.length > 0 ? "discovered" : "static";
      logger.info(
        `DataSyncService: Processing ${finalSymbolsToUpdate.length} ${symbolSource} symbols in ${totalBatches} batches of ${batchSize}`
      );

      for (let i = 0; i < finalSymbolsToUpdate.length; i += batchSize) {
        const batch = finalSymbolsToUpdate.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1;

        logger.info(
          `DataSyncService: Processing batch ${batchNumber}/${totalBatches} (${batch.length} symbols)`
        );
        logger.debug(
          `DataSyncService: Batch ${batchNumber} symbols: ${batch.join(", ")}`
        );

        await this.processBatch(batch, intervals);

        // Longer delay between batches for large-scale collection
        if (i + batchSize < finalSymbolsToUpdate.length) {
          const delayMs = DELAY_BETWEEN_REQUESTS * 10; // 5 second delay between batches
          logger.debug(
            `DataSyncService: Waiting ${delayMs}ms before next batch...`
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }

      // Step 3: Save updated data to persistent storage
      logger.info(
        "DataSyncService: Saving updated data to persistent storage..."
      );
      const repositoryData = new Map<string, Record<string, any>>();
      const summary = CandlestickRepository.getSummary();

      for (const [symbol, intervalSummary] of Object.entries(summary)) {
        const symbolData: Record<string, any> = {};
        for (const interval of intervals) {
          const candlesticks = CandlestickRepository.getCandlesticks(
            symbol,
            interval
          );
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

      logger.info(
        "DataSyncService: Enhanced historical data initialization completed successfully"
      );
      logger.info(
        "Final candlestick data summary:",
        CandlestickRepository.getSummary()
      );
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
        const config: CandlestickIntervalConfig | undefined =
          CANDLESTICK_INTERVALS[interval];
        if (!config) {
          logger.warn(
            `DataSyncService: No configuration found for interval ${interval}. Skipping.`
          );
          continue;
        }

        try {
          const historicalCandles =
            await BinanceClient.fetchHistoricalCandlesticks(
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
            logger.warn(
              `DataSyncService: No data received for ${symbol} ${interval}`
            );
          }
        } catch (error) {
          logger.error(
            `DataSyncService: Error fetching data for ${symbol} ${interval}: ${
              (error as Error).message
            }`
          );
        }

        // Delay between API calls within the same symbol
        await new Promise((resolve) =>
          setTimeout(resolve, DELAY_BETWEEN_REQUESTS)
        );
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

    logger.info(
      `DataSyncService: Set up periodic updates every ${CANDLESTICK_UPDATE_INTERVAL_MINUTES} minutes`
    );
  }

  /**
   * Perform periodic update of candlestick data
   */
  private static async performPeriodicUpdate(): Promise<void> {
    try {
      // Update symbols with intelligent prioritization using discovered symbols
      const intervals = Object.keys(
        CANDLESTICK_INTERVALS
      ) as (keyof typeof CANDLESTICK_INTERVALS)[];

      // Use discovered symbols with volume-based prioritization
      const discoveredSymbols =
        SymbolDiscoveryService.getTopSymbolsByVolume(100);

      if (discoveredSymbols.length === 0) {
        logger.warn(
          "DataSyncService: No discovered symbols available for periodic update, using safe static list"
        );
        // Fallback to safe static list (only symbols we know work)
        const safeSymbols = [
          "BTCUSDT",
          "ETHUSDT",
          "BNBUSDT",
          "ADAUSDT",
          "SOLUSDT",
          "XRPUSDT",
          "DOTUSDT",
          "DOGEUSDT",
          "AVAXUSDT",
          "MATICUSDT",
          "LINKUSDT",
          "ATOMUSDT",
          "ALGOUSDT",
          "VETUSDT",
          "FILUSDT",
          "TRXUSDT",
          "LTCUSDT",
          "BCHUSDT",
          "XLMUSDT",
          "EOSUSDT",
        ];

        logger.info(
          `DataSyncService: Periodic update - Using ${safeSymbols.length} safe static symbols`
        );
        await this.updateSymbolBatch(safeSymbols, intervals);
        return;
      }

      // Prioritize top symbols by volume (discovered symbols are already sorted)
      const topSymbols = discoveredSymbols.slice(0, 50);
      const secondTierSymbols = discoveredSymbols.slice(50, 100);

      // Alternate between top tier and second tier symbols
      const updateCount =
        Date.now() / (CANDLESTICK_UPDATE_INTERVAL_MINUTES * 60 * 1000);
      const isTopTierUpdate = Math.floor(updateCount) % 2 === 0;

      const symbolsToUpdate = isTopTierUpdate ? topSymbols : secondTierSymbols;

      logger.info(
        `DataSyncService: Periodic update - ${
          isTopTierUpdate ? "Top tier" : "Second tier"
        } discovered symbols (${symbolsToUpdate.length} symbols)`
      );

      await this.updateSymbolBatch(symbolsToUpdate, intervals);

      // Save updated data
      const repositoryData = new Map<string, Record<string, any>>();
      const summary = CandlestickRepository.getSummary();

      for (const [symbol, intervalSummary] of Object.entries(summary)) {
        const symbolData: Record<string, any> = {};
        for (const interval of intervals) {
          const candlesticks = CandlestickRepository.getCandlesticks(
            symbol,
            interval
          );
          if (candlesticks) {
            symbolData[interval] = candlesticks;
          }
        }
        if (Object.keys(symbolData).length > 0) {
          repositoryData.set(symbol, symbolData);
        }
      }

      await CandlestickStorageService.saveAllCandlestickData(repositoryData);

      logger.info("DataSyncService: Periodic update completed successfully");
    } catch (error) {
      logger.error(
        `DataSyncService: Error during periodic update: ${
          (error as Error).message
        }`
      );
    }
  }

  /**
   * Helper method to update a batch of symbols (extracted for reuse)
   */
  private static async updateSymbolBatch(
    symbolsToUpdate: string[],
    intervals: (keyof typeof CANDLESTICK_INTERVALS)[]
  ): Promise<void> {
    // Process in smaller batches for periodic updates
    for (
      let i = 0;
      i < symbolsToUpdate.length;
      i += PERIODIC_UPDATE_BATCH_SIZE
    ) {
      const batch = symbolsToUpdate.slice(i, i + PERIODIC_UPDATE_BATCH_SIZE);
      await this.processBatch(batch, intervals);

      // Small delay between batches
      if (i + PERIODIC_UPDATE_BATCH_SIZE < symbolsToUpdate.length) {
        await new Promise((resolve) =>
          setTimeout(resolve, DELAY_BETWEEN_REQUESTS * 3)
        );
      }
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
