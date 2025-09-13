/**
 * API Route Handlers
 * Direct HTTP request handlers for cryptocurrency data endpoints
 */
import { Request, Response } from "express";
import { readFileSync } from "fs";
import { join } from "path";
import logger from "../utils/logger.js";
import DataManager from "../core/DataManager.js";
import BinanceClient from "../core/BinanceClient.js";
import CandlestickStorage from "../services/CandlestickStorage.js";
import DatabaseConnection from "../services/DatabaseConnection.js";
import MarketOverviewService from "../services/MarketOverviewService.js";

// Global client instance
let binanceClient: BinanceClient | null = null;

export function setBinanceClient(client: BinanceClient): void {
  binanceClient = client;
}

/**
 * Health check endpoint
 */
export function healthCheck(req: Request, res: Response): void {
  try {
    const stats = DataManager.getStats();
    const clientStatus = binanceClient?.getStatus() || { connected: false };

    res.json({
      success: true,
      message: "Spikey Coins Proxy Server",
      description: "Real-time cryptocurrency data proxy server",
      status: "healthy",
      timestamp: new Date().toISOString(),
      stats: {
        ...stats,
        websocketStatus: clientStatus,
      },
    });
  } catch (error) {
    logger.error("Routes: Error in health check:", error);
    res.status(500).json({
      success: false,
      error: "Health check failed",
    });
  }
}

/**
 * Ticker router health check
 */
export function tickerHealth(req: Request, res: Response): void {
  try {
    const stats = DataManager.getStats();
    const clientStatus = binanceClient?.getStatus() || { connected: false };

    res.json({
      success: true,
      message: "Ticker router is running",
      status: "healthy",
      tickerDataCount: stats.tickerCount,
      candlestickSymbols: stats.candlestickSymbols,
      timestamp: new Date().toISOString(),
      websocketStatus: clientStatus,
    });
  } catch (error) {
    logger.error("Routes: Error in ticker health check:", error);
    res.status(500).json({
      success: false,
      error: "Ticker health check failed",
    });
  }
}

/**
 * Get 24hr ticker data
 */
export function get24hrTicker(req: Request, res: Response): void {
  try {
    const tickers = DataManager.getAllTickers();
    
    res.json({
      success: true,
      data: tickers,
      count: tickers.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Routes: Error getting 24hr ticker data:", error);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve ticker data",
    });
  }
}

/**
 * Get candlestick summary
 */
export function getCandlestickSummary(req: Request, res: Response): void {
  try {
    const summary = DataManager.getCandlestickSummary();
    const symbols = summary.map(s => s.symbol);
    
    res.json({
      success: true,
      symbols,
      summary,
      count: summary.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Routes: Error getting candlestick summary:", error);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve candlestick summary",
    });
  }
}

/**
 * Get candlestick data for specific symbol
 */
export function getCandlestickData(req: Request, res: Response): void {
  try {
    const symbol = req.params.symbol?.toUpperCase();
    const interval = (req.query.interval as string) || '15m';
    
    if (!symbol) {
      res.status(400).json({
        success: false,
        error: "Symbol parameter is required",
      });
      return;
    }
    
    const candlesticks = DataManager.getCandlesticks(symbol, interval);
    
    if (candlesticks.length === 0) {
      res.status(404).json({
        success: false,
        error: `No candlestick data available for ${symbol} at ${interval} interval`,
      });
      return;
    }
    
    res.json({
      success: true,
      symbol,
      interval,
      data: candlesticks,
      count: candlesticks.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Routes: Error getting candlestick data:", error);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve candlestick data",
    });
  }
}

/**
 * Get ticker data for specific symbol
 */
export function getTickerBySymbol(req: Request, res: Response): void {
  try {
    const symbol = req.params.symbol?.toUpperCase();
    
    if (!symbol) {
      res.status(400).json({
        success: false,
        error: "Symbol parameter is required",
      });
      return;
    }
    
    const ticker = DataManager.getTickerBySymbol(symbol);
    
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
    logger.error("Routes: Error getting ticker by symbol:", error);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve ticker data",
    });
  }
}

/**
 * Get storage statistics
 */
export function getStorageStats(req: Request, res: Response): void {
  try {
    const stats = DataManager.getStorageStats();
    
    res.json({
      success: true,
      storage: {
        metadata: stats.metadata,
        filesCount: stats.filesCount,
        totalSizeBytes: stats.totalSizeBytes,
        totalSizeMB: Math.round(stats.totalSizeBytes / 1024 / 1024 * 100) / 100,
      },
      inMemory: stats.inMemory,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Routes: Error getting storage stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve storage statistics",
    });
  }
}

/**
 * Get discovery statistics
 */
export function getDiscoveryStats(req: Request, res: Response): void {
  try {
    const stats = DataManager.getDiscoveryStats();
    
    res.json({
      success: true,
      discovery: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Routes: Error getting discovery stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve discovery statistics",
    });
  }
}

/**
 * Get market cap data from local files
 */
export function getMarketCapData(req: Request, res: Response): void {
  try {
    // Try to read market cap data from scripts output directory
    const possiblePaths = [
      join(process.cwd(), '../scripts/output/binance-coingecko-matches.csv'),
      join(process.cwd(), 'scripts/output/binance-coingecko-matches.csv'),
      join(process.cwd(), '../scripts/binance-coingecko-matcher/binance-coingecko-matches.csv'),
    ];
    
    let marketCapData: any = null;
    let dataSource = 'not_found';
    
    for (const filePath of possiblePaths) {
      try {
        const csvContent = readFileSync(filePath, 'utf-8');
        // Parse first few lines as a simple indicator
        const lines = csvContent.split('\n').slice(0, 10);
        marketCapData = {
          source: filePath,
          preview: lines,
          lineCount: csvContent.split('\n').length - 1, // -1 for header
        };
        dataSource = 'csv_file';
        break;
      } catch (fileError) {
        // Continue trying other paths
        continue;
      }
    }
    
    if (!marketCapData) {
      // Fallback response
      marketCapData = {
        message: "Market cap data files not found",
        searchedPaths: possiblePaths,
        note: "Run the binance-coingecko-matcher script to generate market cap data",
      };
    }
    
    res.json({
      success: true,
      dataSource,
      data: marketCapData,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    logger.error("Routes: Error getting market cap data:", error);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve market cap data",
    });
  }
}

/**
 * Get candlestick storage statistics
 */
export function getCandlestickStorageStats(req: Request, res: Response): void {
  try {
    const stats = CandlestickStorage.getStats();
    
    res.json({
      success: true,
      candlestickStorage: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Routes: Error getting candlestick storage stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve candlestick storage statistics",
    });
  }
}

/**
 * Refresh market cap data (placeholder)
 */
export function refreshMarketCapData(req: Request, res: Response): void {
  res.json({
    success: true,
    message: "Market cap data refresh feature not implemented in simplified version",
    note: "Run 'npm run binance-coingecko-matcher' from scripts directory to update data",
  });
}

/**
 * Get market overview data (cryptocurrencies + Bitcoin dominance)
 * Returns cached data updated every 30 seconds
 */
export function getMarketOverview(req: Request, res: Response): void {
  try {
    const marketService = MarketOverviewService.getInstance();
    const cachedData = marketService.getCachedData();
    const status = marketService.getStatus();

    logger.info(`MarketOverview API: Service status - hasData: ${status.hasData}, cryptoCount: ${status.cryptoCount}`);

    if (!cachedData || !cachedData.cryptocurrencies || cachedData.cryptocurrencies.length === 0) {
      logger.warn("MarketOverview API: No cached data available, returning service status");
      res.status(503).json({
        success: false,
        error: "Market data not available yet",
        message: "Service is initializing, please try again in a few seconds",
        status: status,
        debug: {
          hasCachedData: !!cachedData,
          cryptoCount: cachedData?.cryptocurrencies?.length || 0,
          lastUpdated: cachedData?.last_updated || null
        }
      });
      return;
    }

    logger.info(`MarketOverview API: Returning ${cachedData.cryptocurrencies.length} cryptocurrencies`);

    res.json({
      success: true,
      data: {
        cryptocurrencies: cachedData.cryptocurrencies,
        bitcoin_dominance: cachedData.bitcoin_dominance
      },
      meta: {
        crypto_count: cachedData.cryptocurrencies.length,
        last_updated: cachedData.last_updated,
        next_update: cachedData.next_update,
        update_interval_seconds: status.updateInterval
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error("Routes: Error getting market overview:", error);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve market overview data",
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Force refresh market overview data
 * Triggers immediate update of cached data
 */
export async function forceRefreshMarketOverview(req: Request, res: Response): Promise<void> {
  try {
    const marketService = MarketOverviewService.getInstance();
    await marketService.forceUpdate();
    
    const cachedData = marketService.getCachedData();
    const status = marketService.getStatus();

    res.json({
      success: true,
      message: "Market overview data refreshed successfully",
      data: cachedData,
      status: status,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error("Routes: Error force refreshing market overview:", error);
    res.status(500).json({
      success: false,
      error: "Failed to refresh market overview data",
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Get market summaries from database
 * Fetches latest market news and analysis from summaries collection
 */
export async function getSummaries(req: Request, res: Response): Promise<void> {
  try {
    if (!DatabaseConnection.isConnectionReady()) {
      await DatabaseConnection.initialize();
    }

    const db = DatabaseConnection.getDatabase();
    const summariesCollection = db.collection('summaries');

    // Get the latest 10 summaries, sorted by creation date
    const summaries = await summariesCollection
      .find({})
      .sort({ createdAt: -1, _id: -1 })
      .limit(10)
      .toArray();

    res.json({
      success: true,
      data: summaries,
      count: summaries.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Routes: Error getting summaries:", error);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve market summaries",
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Get user watchlists from database
 * Fetches user-specific watchlists or returns empty defaults
 */
export async function getUserWatchlists(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.query.userId as string;

    if (!DatabaseConnection.isConnectionReady()) {
      await DatabaseConnection.initialize();
    }

    const db = DatabaseConnection.getDatabase();
    const watchlistsCollection = db.collection('watchlists');

    let watchlists: any[] = [];
    
    if (userId) {
      // Get user-specific watchlists
      watchlists = await watchlistsCollection
        .find({ userId })
        .sort({ createdAt: -1 })
        .limit(3)
        .toArray();
    } else {
      // Return empty watchlists for anonymous users
      watchlists = [];
    }

    res.json({
      success: true,
      data: watchlists,
      count: watchlists.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Routes: Error getting user watchlists:", error);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve user watchlists",
      details: error instanceof Error ? error.message : String(error)
    });
  }
}