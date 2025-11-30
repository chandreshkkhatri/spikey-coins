/**
 * Coin Sync Service
 * Syncs Binance spot and futures symbols to database every 24 hours
 * Tracks active coins and marks delisted coins as inactive
 */

import axios from 'axios';
import logger from '../utils/logger.js';
import DatabaseConnection from './DatabaseConnection.js';
import BinanceCoinGeckoMatcher from './BinanceCoinGeckoMatcher.js';

// Type definitions
interface BinanceSymbol {
  symbol: string;
  status: string;
  baseAsset: string;
  quoteAsset: string;
  isSpotTradingAllowed?: boolean;
}

interface CoinDocument {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  marketType: 'spot' | 'futures' | 'both';
  status: 'active' | 'delisted';
  firstSeen: Date;
  lastSeen: Date;
  delistedAt?: Date;
  updatedAt: Date;
}

interface SyncStatus {
  running: boolean;
  lastRun?: Date;
  lastRunDuration?: number;
  lastRunResult?: {
    totalCoins: number;
    newCoins: number;
    activeCoins: number;
    delistedCoins: number;
  };
  nextRun?: Date;
  error?: string;
}

class CoinSyncService {
  private static instance: CoinSyncService;
  private isRunning: boolean = false;
  private lastRunDate?: Date;
  private lastRunResult?: any;
  private intervalId: NodeJS.Timeout | null = null;
  
  private readonly BINANCE_BASE_URL = 'https://api.binance.com';
  private readonly BINANCE_FUTURES_URL = 'https://fapi.binance.com';
  private readonly SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

  private constructor() {}

  static getInstance(): CoinSyncService {
    if (!this.instance) {
      this.instance = new CoinSyncService();
    }
    return this.instance;
  }

  /**
   * Start the coin sync service with 24h interval
   */
  start(): void {
    if (this.intervalId) {
      logger.warn('CoinSyncService: Service already running');
      return;
    }

    logger.info('CoinSyncService: Starting coin sync service (runs every 24 hours)');

    // Run immediately on start
    this.runSync().catch((error) => {
      logger.error('CoinSyncService: Initial sync failed:', error);
    });

    // Schedule to run every 24 hours
    this.intervalId = setInterval(() => {
      this.runSync().catch((error) => {
        logger.error('CoinSyncService: Scheduled sync failed:', error);
      });
    }, this.SYNC_INTERVAL_MS);

    logger.info('CoinSyncService: Service started successfully');
  }

  /**
   * Stop the coin sync service
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('CoinSyncService: Service stopped');
    }
  }

  /**
   * Get current sync status
   */
  getStatus(): SyncStatus {
    const nextRun = this.lastRunDate 
      ? new Date(this.lastRunDate.getTime() + this.SYNC_INTERVAL_MS)
      : undefined;

    return {
      running: this.isRunning,
      lastRun: this.lastRunDate,
      lastRunResult: this.lastRunResult,
      nextRun
    };
  }

  /**
   * Manually trigger a coin sync
   */
  async triggerManually(): Promise<{ success: boolean; result?: any; error?: string }> {
    try {
      if (this.isRunning) {
        return {
          success: false,
          error: 'Sync is already running'
        };
      }

      const result = await this.runSync();
      return {
        success: true,
        result
      };
    } catch (error) {
      logger.error('CoinSyncService: Manual sync failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Run the coin sync process
   */
  private async runSync(): Promise<any> {
    if (this.isRunning) {
      logger.warn('CoinSyncService: Sync already in progress, skipping');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      logger.info('CoinSyncService: Starting coin sync...');

      // Initialize database connection if needed
      if (!DatabaseConnection.isConnectionReady()) {
        await DatabaseConnection.initialize();
      }

      const db = DatabaseConnection.getDatabase();
      if (!db) {
        throw new Error('Database connection not available');
      }

      const coinsCollection = db.collection<CoinDocument>('coins');

      // Fetch current symbols from Binance
      const [spotSymbols, futuresSymbols] = await Promise.all([
        this.fetchBinanceSpotSymbols(),
        this.fetchBinanceFuturesSymbols()
      ]);

      logger.info(`CoinSyncService: Fetched ${spotSymbols.length} spot symbols and ${futuresSymbols.length} futures symbols`);

      // Build map of current active symbols
      const currentSymbols = new Map<string, { baseAsset: string; quoteAsset: string; types: Set<'spot' | 'futures'> }>();

      // Process spot symbols
      for (const symbol of spotSymbols) {
        if (symbol.quoteAsset === 'USDT') {
          const key = symbol.symbol;
          if (!currentSymbols.has(key)) {
            currentSymbols.set(key, {
              baseAsset: symbol.baseAsset,
              quoteAsset: symbol.quoteAsset,
              types: new Set(['spot'])
            });
          } else {
            currentSymbols.get(key)!.types.add('spot');
          }
        }
      }

      // Process futures symbols
      for (const symbol of futuresSymbols) {
        if (symbol.quoteAsset === 'USDT') {
          const key = symbol.symbol;
          if (!currentSymbols.has(key)) {
            currentSymbols.set(key, {
              baseAsset: symbol.baseAsset,
              quoteAsset: symbol.quoteAsset,
              types: new Set(['futures'])
            });
          } else {
            currentSymbols.get(key)!.types.add('futures');
          }
        }
      }

      const now = new Date();
      let newCoins = 0;
      let updatedCoins = 0;

      // Update or insert active coins
      for (const [symbol, data] of currentSymbols.entries()) {
        const marketType = data.types.size === 2 ? 'both' : 
                          data.types.has('spot') ? 'spot' : 'futures';

        const existingCoin = await coinsCollection.findOne({ symbol });

        if (existingCoin) {
          // Update existing coin
          await coinsCollection.updateOne(
            { symbol },
            {
              $set: {
                status: 'active',
                marketType,
                lastSeen: now,
                updatedAt: now,
                delistedAt: undefined // Clear delisted date if it was previously delisted
              }
            }
          );
          updatedCoins++;
        } else {
          // Insert new coin
          await coinsCollection.insertOne({
            symbol,
            baseAsset: data.baseAsset,
            quoteAsset: data.quoteAsset,
            marketType,
            status: 'active',
            firstSeen: now,
            lastSeen: now,
            updatedAt: now
          });
          newCoins++;
        }
      }

      // Mark coins as delisted if they're no longer in current symbols
      const allSymbols = Array.from(currentSymbols.keys());
      const delistResult = await coinsCollection.updateMany(
        {
          symbol: { $nin: allSymbols },
          status: 'active'
        },
        {
          $set: {
            status: 'delisted',
            delistedAt: now,
            updatedAt: now
          }
        }
      );

      const delistedCoins = delistResult.modifiedCount || 0;

      // Get total counts
      const totalCoins = await coinsCollection.countDocuments({});
      const activeCoins = await coinsCollection.countDocuments({ status: 'active' });

      const duration = Date.now() - startTime;
      this.lastRunDate = new Date();
      this.lastRunResult = {
        totalCoins,
        newCoins,
        activeCoins,
        delistedCoins,
        updatedCoins,
        duration
      };

      logger.info(
        `CoinSyncService: Sync completed - Total: ${totalCoins}, New: ${newCoins}, Active: ${activeCoins}, Delisted: ${delistedCoins}, Duration: ${duration}ms`
      );

      // Trigger market cap matcher after successful sync
      logger.info('CoinSyncService: Triggering BinanceCoinGeckoMatcher...');
      try {
        const matcher = BinanceCoinGeckoMatcher.getInstance();
        await matcher.runMatching();
        logger.info('CoinSyncService: BinanceCoinGeckoMatcher completed successfully');
      } catch (matcherError) {
        logger.error('CoinSyncService: BinanceCoinGeckoMatcher failed:', matcherError);
        // Don't throw - coin sync was successful even if matcher fails
      }

      return this.lastRunResult;

    } catch (error) {
      logger.error('CoinSyncService: Sync error:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Fetch Binance spot symbols
   */
  private async fetchBinanceSpotSymbols(): Promise<BinanceSymbol[]> {
    try {
      const response = await axios.get(`${this.BINANCE_BASE_URL}/api/v3/exchangeInfo`, {
        timeout: 30000
      });

      const activeSymbols = response.data.symbols.filter(
        (symbol: any) =>
          symbol.status === 'TRADING' &&
          symbol.isSpotTradingAllowed &&
          symbol.quoteAsset === 'USDT'
      );

      return activeSymbols.map((s: any) => ({
        symbol: s.symbol,
        status: s.status,
        baseAsset: s.baseAsset,
        quoteAsset: s.quoteAsset,
        isSpotTradingAllowed: s.isSpotTradingAllowed
      }));
    } catch (error) {
      logger.error('CoinSyncService: Error fetching spot symbols:', error);
      throw error;
    }
  }

  /**
   * Fetch Binance futures symbols
   */
  private async fetchBinanceFuturesSymbols(): Promise<BinanceSymbol[]> {
    try {
      const response = await axios.get(`${this.BINANCE_FUTURES_URL}/fapi/v1/exchangeInfo`, {
        timeout: 30000
      });

      const activeSymbols = response.data.symbols.filter(
        (symbol: any) => symbol.status === 'TRADING' && symbol.quoteAsset === 'USDT'
      );

      return activeSymbols.map((s: any) => ({
        symbol: s.symbol,
        status: s.status,
        baseAsset: s.baseAsset,
        quoteAsset: s.quoteAsset
      }));
    } catch (error) {
      logger.error('CoinSyncService: Error fetching futures symbols:', error);
      throw error;
    }
  }

  /**
   * Get active coins from database
   */
  async getActiveCoins(limit: number = 1000): Promise<CoinDocument[]> {
    if (!DatabaseConnection.isConnectionReady()) {
      await DatabaseConnection.initialize();
    }

    const db = DatabaseConnection.getDatabase();
    if (!db) {
      throw new Error('Database connection not available');
    }

    const coinsCollection = db.collection<CoinDocument>('coins');
    const coins = await coinsCollection
      .find({ status: 'active' })
      .sort({ symbol: 1 })
      .limit(limit)
      .toArray();

    return coins;
  }

  /**
   * Get coin statistics
   */
  async getCoinStats(): Promise<{ total: number; active: number; delisted: number; spot: number; futures: number; both: number }> {
    if (!DatabaseConnection.isConnectionReady()) {
      await DatabaseConnection.initialize();
    }

    const db = DatabaseConnection.getDatabase();
    if (!db) {
      throw new Error('Database connection not available');
    }

    const coinsCollection = db.collection<CoinDocument>('coins');

    const [total, active, delisted, spot, futures, both] = await Promise.all([
      coinsCollection.countDocuments({}),
      coinsCollection.countDocuments({ status: 'active' }),
      coinsCollection.countDocuments({ status: 'delisted' }),
      coinsCollection.countDocuments({ marketType: 'spot' }),
      coinsCollection.countDocuments({ marketType: 'futures' }),
      coinsCollection.countDocuments({ marketType: 'both' })
    ]);

    return { total, active, delisted, spot, futures, both };
  }
}

export default CoinSyncService;

