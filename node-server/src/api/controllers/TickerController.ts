/**
 * TickerController - API controller for ticker-related endpoints
 */
import { Request, Response } from "express";
import logger from "../../utils/logger.js";
import { MAJOR_SYMBOLS } from "../../config/constants.js";
import MarketDataService from "../../services/MarketDataService.js";
import type CandlestickRepository from "../../data/repositories/CandlestickRepository.js";
import DataSyncService from "../../services/DataSyncService.js";
import type { getRateLimitingStatus } from "../../utils/rateLimiting.js";

interface TickerControllerDependencies {
  marketDataService: typeof MarketDataService;
  candlestickRepository: typeof CandlestickRepository;
  dataSyncService: typeof DataSyncService;
  getRateLimitingStatusFunction: typeof getRateLimitingStatus;
}

class TickerController {
  private marketDataService: typeof MarketDataService;
  private candlestickRepository: typeof CandlestickRepository;
  private dataSyncService: typeof DataSyncService;
  private getRateLimitingStatus: typeof getRateLimitingStatus;

  constructor({
    marketDataService,
    candlestickRepository,
    dataSyncService,
    getRateLimitingStatusFunction,
  }: TickerControllerDependencies) {
    this.marketDataService = marketDataService;
    this.candlestickRepository = candlestickRepository;
    this.dataSyncService = dataSyncService;
    this.getRateLimitingStatus = getRateLimitingStatusFunction; // Renamed to avoid conflict
  }

  /**
   * Health check endpoint controller
   */
  getHealthCheck(req: Request, res: Response): void {
    try {
      const latestTickers = MarketDataService.getLatestEnrichedTickers();
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
      logger.error("TickerController: Error in getHealthCheck:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error during health check",
      });
    }
  }

  /**
   * Get 24hr ticker data with short-term changes
   */
  get24hrTickerData(req: Request, res: Response): void {
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
   */
  getCandlestickDataBySymbol(req: Request, res: Response): void {
    try {
      const symbol = req.params.symbol.toLowerCase(); // Normalize to lowercase as stored in repository
      const interval = req.query.interval?.toString() || "1m"; // Default to 1m, ensure string

      const data = this.candlestickRepository.getCandlesticks(symbol, interval);

      if (!data || data.length === 0) {
        res.status(404).json({
          success: false,
          error: `No candlestick data available for ${symbol} at ${interval} interval`,
        });
        return;
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
      logger.error(
        "TickerController: Error sending candlestick data by symbol:",
        error
      );
      res.status(500).json({
        success: false,
        error: "Failed to retrieve candlestick data",
      });
    }
  }

  /**
   * Get a summary of all available candlestick data (symbols and their intervals)
   */
  getCandlestickSummary(req: Request, res: Response): void {
    try {
      const summary = this.candlestickRepository.getSummary();
      res.json({
        success: true,
        summary: summary,
        count: summary.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error(
        "TickerController: Error sending candlestick summary:",
        error
      );
      res.status(500).json({
        success: false,
        error: "Failed to retrieve candlestick summary",
      });
    }
  }

  /**
   * Get market cap data (now primarily from CoinGecko, managed by DataSyncService)
   */
  async getMarketCapData(req: Request, res: Response): Promise<void> {
    try {
      // The CoinGecko data is fetched periodically by DataSyncService and used by MarketDataService.
      // For this endpoint, we can return the latest processed tickers which include CoinGecko data.
      // Or, if a direct, fresh call to CoinGecko is desired for this specific endpoint, that would be a different design.
      // Assuming we want to show the CoinGecko data that is integrated into our main ticker stream:
      const coingeckoDataMap =
        await this.dataSyncService.getCurrentCoinGeckoDataMap();

      if (!coingeckoDataMap || coingeckoDataMap.size === 0) {
        res.status(404).json({
          success: false,
          error: "CoinGecko market data is not currently available.",
        });
        return;
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
   */
  async refreshMarketData(req: Request, res: Response): Promise<void> {
    logger.info("TickerController: Manual market data refresh requested.");
    try {
      // Note: This method may need to be added to DataSyncService
      // await this.dataSyncService.fetchAndStoreCoinGeckoData();
      const coingeckoDataMap =
        await this.dataSyncService.getCurrentCoinGeckoDataMap();
      logger.info(
        "TickerController: CoinGecko data refresh initiated successfully."
      );
      res.json({
        success: true,
        message:
          "CoinGecko market data refresh initiated. Check logs for status.",
        count: coingeckoDataMap.size,
      });
    } catch (error) {
      logger.error(
        "TickerController: Error initiating market data refresh:",
        error
      );
      res.status(500).json({
        success: false,
        error: "Failed to initiate market data refresh.",
      });
    }
  }
}

export default TickerController;
