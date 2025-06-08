/**
 * TickerStreamHandler - Handles ticker stream messages from Binance WebSocket
 */
import logger from "../../utils/logger.js";
import { MAJOR_SYMBOLS } from "../../config/constants.js";
import MarketDataService from "../../services/MarketDataService.js";
import DataSyncService from "../../services/DataSyncService.js";

interface TickerStreamHandlerDependencies {
  marketDataService: typeof MarketDataService;
  dataSyncService: typeof DataSyncService;
}

class TickerStreamHandler {
  private marketDataService: typeof MarketDataService;
  private dataSyncService: typeof DataSyncService;
  private majorSymbolsSet: Set<string>;

  constructor({
    marketDataService,
    dataSyncService,
  }: TickerStreamHandlerDependencies) {
    this.marketDataService = marketDataService;
    this.dataSyncService = dataSyncService;
    this.majorSymbolsSet = new Set(MAJOR_SYMBOLS.map((s) => s.toUpperCase())); // Ensure uppercase for comparison with Binance data
  }

  /**
   * Handles incoming ticker array messages from Binance WebSocket.
   * @param rawTickerArray - Array of ticker objects from Binance.
   */
  async handleMessage(rawTickerArray: any[]): Promise<void> {
    if (!Array.isArray(rawTickerArray)) {
      logger.warn(
        "TickerStreamHandler: Expected an array of tickers, received:",
        typeof rawTickerArray
      );
      return;
    }

    // Filter for major symbols if necessary, or process all
    // For now, we assume the stream `!ticker@arr` sends all, and we might want to process all
    // or filter based on a dynamic list later. The current `MAJOR_SYMBOLS` is for initial data fetching.
    // This handler will process whatever Binance sends on `!ticker@arr`.    // logger.debug(`TickerStreamHandler: Received ${rawTickerArray.length} tickers.`);

    try {
      const coingeckoDataMap =
        await DataSyncService.getCurrentCoinGeckoDataMap();
      if (!coingeckoDataMap || coingeckoDataMap.size === 0) {
        logger.warn(
          "TickerStreamHandler: CoinGecko data map is not available or empty. Tickers may not be fully enriched."
        );
      }
      MarketDataService.processAndStoreEnrichedTickers(
        rawTickerArray,
        coingeckoDataMap
      );
      // logger.debug('TickerStreamHandler: Successfully processed and stored enriched tickers.');
    } catch (error) {
      logger.error(
        `TickerStreamHandler: Error processing ticker array: ${
          (error as Error).message
        }`,
        { error }
      );
    }
  }

  /**
   * Returns the stream names this handler is interested in.
   * In this case, it's the aggregate stream for all 24hr tickers.
   * @returns Array of stream names
   */
  getStreamNames(): string[] {
    return ["!ticker@arr"]; // Stream for 24hr Mini Ticker statistics for all symbols
  }
}

export default TickerStreamHandler;
