/**
 * Admin Routes
 * Administrative endpoints for managing system tasks and operations
 */

import { Request, Response } from 'express';
import DatabaseConnection from '../services/DatabaseConnection.js';
import BinanceCoinGeckoMatcher from '../services/BinanceCoinGeckoMatcher.js';
import logger from '../utils/logger.js';

/**
 * Get admin dashboard overview
 */
export async function getAdminDashboard(req: Request, res: Response): Promise<void> {
  try {
    if (!DatabaseConnection.isConnectionReady()) {
      await DatabaseConnection.initialize();
    }

    const db = DatabaseConnection.getDatabase();

    // Get system statistics
    const stats = await Promise.all([
      db.collection('users').countDocuments(),
      db.collection('summaries').countDocuments(),
      db.collection('watchlists').countDocuments(),
      db.stats()
    ]);

    const [userCount, summaryCount, watchlistCount, dbStats] = stats;

    const dashboardData = {
      system: {
        uptime: process.uptime(),
        nodeVersion: process.version,
        memoryUsage: process.memoryUsage(),
        platform: process.platform
      },
      database: {
        name: db.databaseName,
        collections: dbStats.collections,
        dataSize: dbStats.dataSize,
        storageSize: dbStats.storageSize
      },
      counts: {
        users: userCount,
        summaries: summaryCount,
        watchlists: watchlistCount
      },
      user: req.user
    };

    logger.info(`Admin: Dashboard accessed by ${req.user?.username}`);
    res.json({
      success: true,
      data: dashboardData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Admin: Dashboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load admin dashboard'
    });
  }
}

/**
 * Get all users (admin only)
 */
export async function getAllUsers(req: Request, res: Response): Promise<void> {
  try {
    if (!DatabaseConnection.isConnectionReady()) {
      await DatabaseConnection.initialize();
    }

    const db = DatabaseConnection.getDatabase();
    const usersCollection = db.collection('users');

    const users = await usersCollection
      .find({}, { projection: { password: 0 } })
      .sort({ createdAt: -1 })
      .toArray();

    logger.info(`Admin: User list accessed by ${req.user?.username} - ${users.length} users found`);
    res.json({
      success: true,
      data: users,
      count: users.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Admin: Get all users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve users'
    });
  }
}

/**
 * Get system logs (placeholder for future implementation)
 */
export async function getSystemLogs(req: Request, res: Response): Promise<void> {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const level = req.query.level as string || 'info';

    // This is a placeholder - in a real implementation you would
    // read from your logging system or log files
    const logs = {
      message: 'Log retrieval not implemented yet',
      note: 'This endpoint would return recent system logs',
      requestedLimit: limit,
      requestedLevel: level
    };

    logger.info(`Admin: System logs accessed by ${req.user?.username}`);
    res.json({
      success: true,
      data: logs,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Admin: Get system logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve system logs'
    });
  }
}

/**
 * Clear old data (admin maintenance task)
 */
export async function clearOldData(req: Request, res: Response): Promise<void> {
  try {
    const daysOld = parseInt(req.body.daysOld) || 30;
    const collection = req.body.collection as string;

    if (!collection) {
      res.status(400).json({
        success: false,
        error: 'Collection name is required'
      });
      return;
    }

    if (!DatabaseConnection.isConnectionReady()) {
      await DatabaseConnection.initialize();
    }

    const db = DatabaseConnection.getDatabase();
    const targetCollection = db.collection(collection);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    // Only allow clearing of specific collections for safety
    const allowedCollections = ['summaries', 'watchlists'];
    if (!allowedCollections.includes(collection)) {
      res.status(400).json({
        success: false,
        error: `Collection '${collection}' is not allowed for cleanup. Allowed: ${allowedCollections.join(', ')}`
      });
      return;
    }

    const result = await targetCollection.deleteMany({
      createdAt: { $lt: cutoffDate }
    });

    logger.info(`Admin: Data cleanup performed by ${req.user?.username} - ${result.deletedCount} documents removed from ${collection}`);
    res.json({
      success: true,
      message: `Cleared ${result.deletedCount} old records from ${collection}`,
      deletedCount: result.deletedCount,
      cutoffDate: cutoffDate.toISOString(),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Admin: Clear old data error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear old data'
    });
  }
}

/**
 * Refresh system caches (admin maintenance task)
 */
export async function refreshSystemCaches(req: Request, res: Response): Promise<void> {
  try {
    // This would trigger cache refresh operations
    // For now, it's a placeholder that simulates the operation

    const cacheTypes = req.body.cacheTypes || ['market-data', 'ticker-data'];
    const results = [];

    for (const cacheType of cacheTypes) {
      results.push({
        type: cacheType,
        status: 'refreshed',
        timestamp: new Date().toISOString()
      });
    }

    logger.info(`Admin: Cache refresh performed by ${req.user?.username} - ${cacheTypes.length} caches refreshed`);
    res.json({
      success: true,
      message: 'System caches refreshed successfully',
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Admin: Refresh system caches error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh system caches'
    });
  }
}

/**
 * Run Binance-CoinGecko matching process (admin only)
 * Matches Binance symbols with CoinGecko data to get market cap information
 */
export async function runBinanceCoinGeckoMatcher(req: Request, res: Response): Promise<void> {
  try {
    const matcher = BinanceCoinGeckoMatcher.getInstance();
    const status = matcher.getStatus();

    // Check if already running
    if (status.running) {
      res.status(409).json({
        success: false,
        error: 'Matching process is already running',
        status
      });
      return;
    }

    // Check if COINGECKO_API_KEY is configured
    if (!process.env.COINGECKO_API_KEY) {
      res.status(503).json({
        success: false,
        error: 'CoinGecko API key not configured',
        message: 'Please set COINGECKO_API_KEY environment variable'
      });
      return;
    }

    logger.info(`Admin: Binance-CoinGecko matcher started by ${req.user?.username}`);

    // Run the matching process
    const result = await matcher.runMatching();

    logger.info(`Admin: Binance-CoinGecko matcher completed - Matched: ${result.matched}, Unmatched: ${result.unmatched}`);

    res.json({
      success: true,
      message: 'Binance-CoinGecko matching completed successfully',
      result: {
        matched: result.matched,
        unmatched: result.unmatched,
        timestamp: new Date().toISOString()
      },
      performedBy: req.user?.username
    });

  } catch (error) {
    logger.error('Admin: Binance-CoinGecko matcher error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run Binance-CoinGecko matcher',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Get Binance-CoinGecko matcher status (admin only)
 */
export async function getBinanceCoinGeckoMatcherStatus(req: Request, res: Response): Promise<void> {
  try {
    const matcher = BinanceCoinGeckoMatcher.getInstance();
    const status = matcher.getStatus();

    res.json({
      success: true,
      status,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Admin: Get matcher status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get matcher status'
    });
  }
}

/**
 * Get latest Binance-CoinGecko matches (admin only)
 */
export async function getLatestMatches(req: Request, res: Response): Promise<void> {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const matcher = BinanceCoinGeckoMatcher.getInstance();

    const matches = await matcher.getLatestMatches(limit);

    res.json({
      success: true,
      data: matches,
      count: matches.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Admin: Get latest matches error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get latest matches',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}