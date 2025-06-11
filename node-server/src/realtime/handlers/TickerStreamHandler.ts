/**
 * TickerStreamHandler - Handles ticker stream messages from Binance WebSocket
 */
import logger from "../../utils/logger.js";
import { MAJOR_SYMBOLS } from "../../config/constants.js";
import MarketDataService from "../../services/MarketDataService.js";
import SymbolDiscoveryService from "../../services/SymbolDiscoveryService.js";

interface TickerStreamHandlerDependencies {
  marketDataService: typeof MarketDataService;
}

class TickerStreamHandler {
  private marketDataService: typeof MarketDataService;
  private majorSymbolsSet: Set<string>;

  constructor({
    marketDataService,
  }: TickerStreamHandlerDependencies) {
    this.marketDataService = marketDataService;
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

    logger.info(`TickerStreamHandler: Received ${rawTickerArray.length} tickers from WebSocket`);

    try {
      // Update symbol discovery with live ticker data
      SymbolDiscoveryService.updateFromTickerData(rawTickerArray);
      
      // Process and store ticker data as before
      MarketDataService.processAndStoreEnrichedTickers(rawTickerArray);
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
