/**
 * Price History Service
 * Tracks price history for calculating 7-day changes
 */

import DatabaseConnection from "./DatabaseConnection.js";
import DataManager from "../core/DataManager.js";
import logger from "../utils/logger.js";

interface PriceSnapshot {
  symbol: string;
  price: number;
  timestamp: Date;
}

interface CryptoWith7dChange {
  symbol: string;
  name: string;
  price: string;
  change_24h: number;
  change_7d: number;
  volume: string;
}

class PriceHistoryService {
  private static instance: PriceHistoryService;
  private intervalId: NodeJS.Timeout | null = null;
  private readonly SNAPSHOT_INTERVAL_MS = 60 * 60 * 1000; // Take snapshot every hour

  private constructor() {}

  static getInstance(): PriceHistoryService {
    if (!PriceHistoryService.instance) {
      PriceHistoryService.instance = new PriceHistoryService();
    }
    return PriceHistoryService.instance;
  }

  /**
   * Start periodic price snapshots
   */
  start(): void {
    if (this.intervalId) {
      logger.warn('PriceHistoryService: Already running');
      return;
    }

    logger.info('PriceHistoryService: Starting periodic price snapshots (every hour)');

    // Take immediate snapshot
    this.takeSnapshot();

    // Schedule hourly snapshots
    this.intervalId = setInterval(() => {
      this.takeSnapshot();
    }, this.SNAPSHOT_INTERVAL_MS);
  }

  /**
   * Stop periodic snapshots
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('PriceHistoryService: Stopped');
    }
  }

  /**
   * Take a snapshot of current prices and store in database
   */
  private async takeSnapshot(): Promise<void> {
    try {
      const tickers = DataManager.getAllTickers();

      if (tickers.length === 0) {
        logger.warn('PriceHistoryService: No ticker data available for snapshot');
        return;
      }

      if (!DatabaseConnection.isConnectionReady()) {
        await DatabaseConnection.initialize();
      }

      const db = DatabaseConnection.getDatabase();
      if (!db) {
        throw new Error('Database connection not available');
      }

      const priceHistoryCollection = db.collection('price_history');

      const snapshots: PriceSnapshot[] = tickers.map((ticker: any) => ({
        symbol: ticker.s || 'UNKNOWN',
        price: parseFloat(ticker.c || '0'),
        timestamp: new Date(),
      }));

      // Insert all snapshots
      await priceHistoryCollection.insertMany(snapshots);

      logger.info(`PriceHistoryService: Saved ${snapshots.length} price snapshots`);

      // Clean up old data (keep only last 8 days)
      const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
      const deleteResult = await priceHistoryCollection.deleteMany({
        timestamp: { $lt: eightDaysAgo },
      });

      if (deleteResult.deletedCount && deleteResult.deletedCount > 0) {
        logger.info(`PriceHistoryService: Cleaned up ${deleteResult.deletedCount} old snapshots`);
      }
    } catch (error) {
      logger.error('PriceHistoryService: Error taking snapshot:', error);
    }
  }

  /**
   * Calculate 7-day price changes for all cryptocurrencies
   */
  async calculate7dChanges(): Promise<CryptoWith7dChange[]> {
    try {
      if (!DatabaseConnection.isConnectionReady()) {
        await DatabaseConnection.initialize();
      }

      const db = DatabaseConnection.getDatabase();
      if (!db) {
        throw new Error('Database connection not available');
      }

      const priceHistoryCollection = db.collection('price_history');

      // Get current prices
      const currentTickers = DataManager.getAllTickers();

      // Get prices from 7 days ago
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      // Get the oldest snapshot for each symbol within the 7-day window
      const oldPrices = await priceHistoryCollection
        .aggregate([
          {
            $match: {
              timestamp: { $gte: sevenDaysAgo },
            },
          },
          {
            $sort: { timestamp: 1 }, // Oldest first
          },
          {
            $group: {
              _id: '$symbol',
              oldPrice: { $first: '$price' },
              oldTimestamp: { $first: '$timestamp' },
            },
          },
        ])
        .toArray();

      // Create a map for quick lookup
      const oldPriceMap = new Map<string, number>();
      oldPrices.forEach((item: any) => {
        oldPriceMap.set(item._id, item.oldPrice);
      });

      // Calculate 7d changes
      const result: CryptoWith7dChange[] = currentTickers
        .map((ticker: any) => {
          const symbol = ticker.s || 'UNKNOWN';
          const currentPrice = parseFloat(ticker.c || '0');
          const oldPrice = oldPriceMap.get(symbol);

          let change_7d = 0;
          if (oldPrice && oldPrice > 0) {
            change_7d = ((currentPrice - oldPrice) / oldPrice) * 100;
          }

          return {
            symbol: symbol.replace('USDT', ''),
            name: symbol.replace('USDT', ''),
            price: currentPrice.toString(),
            change_24h: parseFloat(ticker.P || '0'),
            change_7d,
            volume: ticker.q || '0',
          };
        })
        .filter((item) => !isNaN(item.change_7d) && item.change_7d !== 0);

      return result;
    } catch (error) {
      logger.error('PriceHistoryService: Error calculating 7d changes:', error);
      return [];
    }
  }

  /**
   * Get top gainers and losers for 7-day timeframe
   */
  async get7dTopMovers(limit: number = 5): Promise<{
    gainers: CryptoWith7dChange[];
    losers: CryptoWith7dChange[];
  }> {
    try {
      const allCryptos = await this.calculate7dChanges();

      if (allCryptos.length === 0) {
        return { gainers: [], losers: [] };
      }

      // Sort by 7d change
      const sortedByChange = [...allCryptos].sort((a, b) => b.change_7d - a.change_7d);

      const gainers = sortedByChange.slice(0, limit);
      const losers = sortedByChange.slice(-limit).reverse();

      return { gainers, losers };
    } catch (error) {
      logger.error('PriceHistoryService: Error getting 7d top movers:', error);
      return { gainers: [], losers: [] };
    }
  }

  /**
   * Get status
   */
  getStatus(): { running: boolean; interval: string } {
    return {
      running: this.intervalId !== null,
      interval: '1 hour',
    };
  }
}

export default PriceHistoryService;
