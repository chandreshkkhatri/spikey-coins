/**
 * TickerController
 * Handles API endpoints for ticker data, candlestick data, and system status
 */
import { Request, Response } from "express";
import logger from "../../utils/logger.js";
import TickerRepository from "../../data/repositories/TickerRepository.js";
import CandlestickRepository from "../../data/repositories/CandlestickRepository.js";
import CandlestickStorageService from "../../services/CandlestickStorageService.js";
import { getRateLimitingStatus } from "../../utils/rateLimiting.js";
import SymbolDiscoveryService from "../../services/SymbolDiscoveryService.js";

class TickerController {
  /**
   * Health check endpoint controller
   */
  getHealthCheck(req: Request, res: Response): void {
    try {
      const rateLimitStatus = getRateLimitingStatus();
      const inMemorySummary = CandlestickRepository.getSummary();

      res.json({
        success: true,
        message: "Ticker router is running",
        status: "healthy",
        tickerDataCount: TickerRepository.getTickerCount(),
        candlestickSymbolCount: Object.keys(inMemorySummary).length,
        timestamp: new Date().toISOString(),
        rateLimiting: rateLimitStatus,
      });
    } catch (error) {
      logger.error("TickerController: Error in health check:", error);
      res.status(500).json({
        success: false,
        error: "Health check failed",
      });
    }
  }

  /**
   * Get 24hr ticker data with short-term changes
   */
  async get24hrTicker(req: Request, res: Response): Promise<void> {
    try {
      const latestTickers = TickerRepository.getAllTickers();
      res.json({
        success: true,
        data: latestTickers,
        count: latestTickers.length,
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

      const data = CandlestickRepository.getCandlesticks(symbol, interval);

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
      const summary = CandlestickRepository.getSummary();
      res.json({
        success: true,
        summary: summary,
        count: Object.keys(summary).length,
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
   * Get storage statistics and health information
   */
  async getStorageStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await CandlestickStorageService.getStorageStats();
      const inMemorySummary = CandlestickRepository.getSummary();
      
      res.json({
        success: true,
        storage: {
          metadata: stats.metadata,
          filesCount: stats.filesCount,
          totalSizeBytes: stats.totalSizeBytes,
          totalSizeMB: Math.round(stats.totalSizeBytes / 1024 / 1024 * 100) / 100,
        },
        inMemory: {
          symbolCount: Object.keys(inMemorySummary).length,
          totalCandles: Object.values(inMemorySummary).reduce((total, symbol) => 
            total + Object.values(symbol).reduce((symbolTotal, interval) => 
              symbolTotal + interval.count, 0), 0)
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("TickerController: Error getting storage stats:", error);
      res.status(500).json({
        success: false,
        error: "Failed to retrieve storage statistics",
      });
    }
  }

  /**
   * Get symbol discovery statistics
   */
  getDiscoveryStats(req: Request, res: Response): void {
    try {
      const stats = SymbolDiscoveryService.getDiscoveryStats();
      
      res.json({
        success: true,
        discovery: stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("TickerController: Error getting discovery stats:", error);
      res.status(500).json({
        success: false,
        error: "Failed to retrieve discovery statistics",
      });
    }
  }

  /**
   * Get ticker data by symbol
   */
  async getTickerBySymbol(req: Request, res: Response): Promise<void> {
    try {
      const { symbol } = req.params;
      const tickerData = TickerRepository.getAllTickers();
      const ticker = tickerData.find(
        (t) => t.symbol.toUpperCase() === symbol.toUpperCase()
      );

      if (!ticker) {
        res.status(404).json({
          success: false,
          error: `No ticker data available for ${symbol}`,
        });
        return;
      }

      res.json({
        success: true,
        data: ticker,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error(
        "TickerController: Error sending ticker data by symbol:",
        error
      );
      res.status(500).json({
        success: false,
        error: "Failed to retrieve ticker data",
      });
    }
  }
}

export default TickerController;
