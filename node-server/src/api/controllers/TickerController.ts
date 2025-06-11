/**
 * TickerController
 * Handles API endpoints for ticker data, candlestick data, and system status
 */
import { Request, Response } from "express";
import logger from "../../utils/logger.js";
import type TickerRepository from "../../data/repositories/TickerRepository.js";
import type CandlestickRepository from "../../data/repositories/CandlestickRepository.js";
import { getRateLimitingStatus } from "../../utils/rateLimiting.js";

interface TickerControllerDependencies {
  tickerRepository: typeof TickerRepository;
  candlestickRepository: typeof CandlestickRepository;
  getRateLimitingStatusFunction: typeof getRateLimitingStatus;
}

class TickerController {
  private tickerRepository: typeof TickerRepository;
  private candlestickRepository: typeof CandlestickRepository;
  private getRateLimitingStatus: typeof getRateLimitingStatus;

  constructor({
    tickerRepository,
    candlestickRepository,
    getRateLimitingStatusFunction,
  }: TickerControllerDependencies) {
    this.tickerRepository = tickerRepository;
    this.candlestickRepository = candlestickRepository;
    this.getRateLimitingStatus = getRateLimitingStatusFunction; // Renamed to avoid conflict
  }

  /**
   * Health check endpoint controller
   */
  getHealthCheck(req: Request, res: Response): void {
    try {
      const latestTickers = this.tickerRepository.getLatestTickers();
      const candlestickSummary = this.candlestickRepository.getSummary();

      res.json({
        message: "Ticker router is running",
        status: "healthy",
        tickerDataCount: latestTickers.length,
        candlestickSymbolCount: Object.keys(candlestickSummary).length, // Number of symbols with candlestick data
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
      const tickerData = this.tickerRepository.getLatestTickers();
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
}

export default TickerController;
