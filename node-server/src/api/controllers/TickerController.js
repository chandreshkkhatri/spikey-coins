import logger from '../../utils/logger.js';
import { крупнейшие_символы } from '../../config/constants.js'; // Assuming this is a typo and should be MAJOR_SYMBOLS

/**
 * @typedef {import('../../services/MarketDataService.js').default} MarketDataService
 * @typedef {import('../../data/repositories/CandlestickRepository.js').default} CandlestickRepository
 * @typedef {import('../../services/DataSyncService.js').default} DataSyncService
 * @typedef {import('../../utils/rateLimiting.js').getRateLimitingStatus} getRateLimitingStatus
 */

class TickerController {
  /**
   * @param {Object} dependencies
   * @param {MarketDataService} dependencies.marketDataService
   * @param {CandlestickRepository} dependencies.candlestickRepository
   * @param {DataSyncService} dependencies.dataSyncService
   * @param {getRateLimitingStatus} dependencies.getRateLimitingStatusFunction
   */
  constructor({ marketDataService, candlestickRepository, dataSyncService, getRateLimitingStatusFunction }) {
    this.marketDataService = marketDataService;
    this.candlestickRepository = candlestickRepository;
    this.dataSyncService = dataSyncService;
    this.getRateLimitingStatus = getRateLimitingStatusFunction; // Renamed to avoid conflict
  }

  /**
   * Health check endpoint controller
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  getHealthCheck(req, res) {
    try {
      const latestTickers = this.marketDataService.getLatestEnrichedTickers();
      const candlestickSummary = this.candlestickRepository.getSummary();
      
      res.json({
        message: "Ticker router is running",
        status: "healthy",
        tickerDataCount: latestTickers.length,
        candlestickSymbolCount: candlestickSummary.length, // Number of symbols with candlestick data
        // rateLimiting: this.getRateLimitingStatus(), // Assuming getRateLimitingStatus is available
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('TickerController: Error in getHealthCheck:', error);
      res.status(500).json({
        success: false,
        error: "Internal server error during health check",
      });
    }
  }

  /**
   * Get 24hr ticker data with short-term changes
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  get24hrTickerData(req, res) {
    try {
      const tickerData = this.marketDataService.getLatestEnrichedTickers();
      res.json({
        success: true,
        data: tickerData,
        count: tickerData.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("TickerController: Error sending 24hr ticker data:", error);
      res.status(500).json({
        success: false,
        error: "Failed to retrieve 24hr ticker data",
      });
    }
  }

  /**
   * Get candlestick data for a specific symbol
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  getCandlestickDataBySymbol(req, res) {
    try {
      const symbol = req.params.symbol.toLowerCase(); // Normalize to lowercase as stored in repository
      const interval = req.query.interval?.toString() || "1m"; // Default to 1m, ensure string

      const data = this.candlestickRepository.getCandlesticks(symbol, interval);

      if (!data || data.length === 0) {
        return res.status(404).json({
          success: false,
          error: `No candlestick data available for ${symbol} at ${interval} interval`,
        });
      }

      res.json({
        success: true,
        symbol: symbol,
        interval: interval,
        data: data,
        count: data.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("TickerController: Error sending candlestick data by symbol:", error);
      res.status(500).json({
        success: false,
        error: "Failed to retrieve candlestick data",
      });
    }
  }

  /**
   * Get a summary of all available candlestick data (symbols and their intervals)
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  getCandlestickSummary(req, res) {
    try {
      const summary = this.candlestickRepository.getSummary();
      res.json({
        success: true,
        summary: summary,
        count: summary.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("TickerController: Error sending candlestick summary:", error);
      res.status(500).json({
        success: false,
        error: "Failed to retrieve candlestick summary",
      });
    }
  }

  /**
   * Get market cap data (now primarily from CoinGecko, managed by DataSyncService)
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  async getMarketCapData(req, res) {
    try {
      // The CoinGecko data is fetched periodically by DataSyncService and used by MarketDataService.
      // For this endpoint, we can return the latest processed tickers which include CoinGecko data.
      // Or, if a direct, fresh call to CoinGecko is desired for this specific endpoint, that would be a different design.
      // Assuming we want to show the CoinGecko data that is integrated into our main ticker stream:
      const coingeckoDataMap = await this.dataSyncService.getCurrentCoinGeckoDataMap();
      
      if (!coingeckoDataMap || coingeckoDataMap.size === 0) {
        return res.status(404).json({
          success: false,
          error: "CoinGecko market data is not currently available.",
        });
      }
      // Convert Map to Array of values for the response
      const data = Array.from(coingeckoDataMap.values());

      res.json({
        success: true,
        data: data,
        count: data.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("TickerController: Error fetching market cap data:", error);
      res.status(500).json({
        success: false,
        error: "Failed to retrieve market cap data",
      });
    }
  }
  
  /**
   * Placeholder for triggering a manual refresh of CoinGecko data if needed.
   * In the new architecture, DataSyncService handles periodic refreshes.
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  async refreshMarketData(req, res) {
    logger.info("TickerController: Manual market data refresh requested.");
    try {
      await this.dataSyncService.fetchAndStoreCoinGeckoData(); // Expose a method in DataSyncService for this
      logger.info("TickerController: CoinGecko data refresh initiated successfully.");
      res.json({
        success: true,
        message: "CoinGecko market data refresh initiated. Check logs for status.",
      });
    } catch (error) {
      logger.error("TickerController: Error initiating market data refresh:", error);
      res.status(500).json({
        success: false,
        error: "Failed to initiate market data refresh.",
      });
    }
  }
}

export default TickerController;
