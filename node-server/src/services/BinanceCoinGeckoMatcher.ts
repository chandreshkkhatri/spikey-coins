/**
 * Binance-CoinGecko Matcher Service
 * Matches Binance trading symbols with CoinGecko market data to enrich with market cap information
 */

import axios, { AxiosResponse } from 'axios';
import { stringify } from 'csv-stringify/sync';
import * as fs from 'fs/promises';
import * as path from 'path';
import logger from '../utils/logger.js';
import DatabaseConnection from './DatabaseConnection.js';

// Type definitions
interface BinanceExchangeSymbol {
  symbol: string;
  status: string;
  baseAsset: string;
  quoteAsset: string;
  isSpotTradingAllowed: boolean;
}

interface BinanceFuturesSymbol {
  symbol: string;
  status: string;
  baseAsset: string;
  quoteAsset: string;
}

interface BinanceTicker {
  symbol: string;
  price: string;
}

interface CoinGeckoMarketData {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  circulating_supply: number;
  total_supply?: number;
  max_supply?: number;
  ath: number;
  ath_date: string;
  atl: number;
  atl_date: string;
  price_change_24h: number;
  price_change_percentage_24h: number;
}

interface CoinListItem {
  id: string;
  symbol: string;
  name: string;
}

interface MatchedSymbol {
  binanceSymbol: string;
  baseAsset: string;
  quoteAsset: string;
  marketType: 'spot' | 'futures';
  binancePrice: number;
  coingeckoId: string;
  coingeckoSymbol: string;
  coingeckoName: string;
  coingeckoPrice: number;
  priceMatchScore: number;
  marketCap: number;
  marketCapRank: number;
  volume24h: number;
  circulatingSupply: number;
  totalSupply: number | null;
  maxSupply: number | null;
  timestamp: Date;
}

interface MatcherStatus {
  running: boolean;
  lastRun?: Date;
  lastRunDuration?: number;
  lastRunResult?: {
    matched: number;
    unmatched: number;
    errors: number;
  };
  error?: string;
}

class BinanceCoinGeckoMatcher {
  private static instance: BinanceCoinGeckoMatcher;
  private isRunning: boolean = false;
  private lastRunDate?: Date;
  private lastRunResult?: any;

  private readonly BINANCE_BASE_URL = 'https://api.binance.com';
  private readonly BINANCE_FUTURES_URL = 'https://fapi.binance.com';
  private readonly COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';

  private constructor() {}

  static getInstance(): BinanceCoinGeckoMatcher {
    if (!this.instance) {
      this.instance = new BinanceCoinGeckoMatcher();
    }
    return this.instance;
  }

  /**
   * Get current matcher status
   */
  getStatus(): MatcherStatus {
    return {
      running: this.isRunning,
      lastRun: this.lastRunDate,
      lastRunResult: this.lastRunResult
    };
  }

  /**
   * Fetch Binance spot symbols
   */
  private async fetchBinanceSpotSymbols(): Promise<BinanceExchangeSymbol[]> {
    try {
      logger.info('BinanceCoinGeckoMatcher: Fetching Binance spot symbols...');
      const response = await axios.get(`${this.BINANCE_BASE_URL}/api/v3/exchangeInfo`, {
        timeout: 30000
      });

      const activeSymbols = response.data.symbols.filter(
        (symbol: any) =>
          symbol.status === 'TRADING' &&
          symbol.isSpotTradingAllowed &&
          symbol.quoteAsset === 'USDT'
      );

      logger.info(`BinanceCoinGeckoMatcher: Fetched ${activeSymbols.length} active USDT spot symbols`);
      return activeSymbols;
    } catch (error) {
      logger.error('BinanceCoinGeckoMatcher: Error fetching spot symbols:', error);
      throw error;
    }
  }

  /**
   * Fetch Binance futures symbols
   */
  private async fetchBinanceFuturesSymbols(): Promise<BinanceFuturesSymbol[]> {
    try {
      logger.info('BinanceCoinGeckoMatcher: Fetching Binance futures symbols...');
      const response = await axios.get(`${this.BINANCE_FUTURES_URL}/fapi/v1/exchangeInfo`, {
        timeout: 30000
      });

      const activeSymbols = response.data.symbols.filter(
        (symbol: any) => symbol.status === 'TRADING' && symbol.quoteAsset === 'USDT'
      );

      logger.info(`BinanceCoinGeckoMatcher: Fetched ${activeSymbols.length} active USDT futures symbols`);
      return activeSymbols;
    } catch (error) {
      logger.error('BinanceCoinGeckoMatcher: Error fetching futures symbols:', error);
      throw error;
    }
  }

  /**
   * Fetch current prices from Binance
   */
  private async fetchBinancePrices(isSpot: boolean = true): Promise<Map<string, number>> {
    try {
      const url = isSpot
        ? `${this.BINANCE_BASE_URL}/api/v3/ticker/price`
        : `${this.BINANCE_FUTURES_URL}/fapi/v1/ticker/price`;

      logger.info(`BinanceCoinGeckoMatcher: Fetching ${isSpot ? 'spot' : 'futures'} prices...`);
      const response: AxiosResponse<BinanceTicker[]> = await axios.get(url, { timeout: 30000 });

      const priceMap = new Map<string, number>();
      response.data.forEach((ticker) => {
        priceMap.set(ticker.symbol, parseFloat(ticker.price));
      });

      logger.info(`BinanceCoinGeckoMatcher: Fetched ${priceMap.size} ${isSpot ? 'spot' : 'futures'} prices`);
      return priceMap;
    } catch (error) {
      logger.error(`BinanceCoinGeckoMatcher: Error fetching ${isSpot ? 'spot' : 'futures'} prices:`, error);
      throw error;
    }
  }

  /**
   * Fetch CoinGecko coins list
   */
  private async fetchCoinGeckoList(): Promise<CoinListItem[]> {
    try {
      const apiKey = process.env.COINGECKO_API_KEY;
      if (!apiKey) {
        throw new Error('COINGECKO_API_KEY environment variable is required');
      }

      logger.info('BinanceCoinGeckoMatcher: Fetching CoinGecko coins list...');
      const response = await axios.get(`${this.COINGECKO_BASE_URL}/coins/list`, {
        params: {
          x_cg_demo_api_key: apiKey,
          include_platform: false
        },
        timeout: 30000
      });

      logger.info(`BinanceCoinGeckoMatcher: Fetched ${response.data.length} coins from CoinGecko`);
      return response.data;
    } catch (error) {
      logger.error('BinanceCoinGeckoMatcher: Error fetching CoinGecko list:', error);
      throw error;
    }
  }

  /**
   * Fetch CoinGecko market data for specific coin IDs
   */
  private async fetchCoinGeckoMarketData(coinIds: string[]): Promise<CoinGeckoMarketData[]> {
    const apiKey = process.env.COINGECKO_API_KEY;
    if (!apiKey) {
      throw new Error('COINGECKO_API_KEY environment variable is required');
    }

    const allMarketData: CoinGeckoMarketData[] = [];
    const batchSize = 250; // CoinGecko API limit

    for (let i = 0; i < coinIds.length; i += batchSize) {
      const batch = coinIds.slice(i, i + batchSize);
      const idsString = batch.join(',');

      try {
        logger.info(`BinanceCoinGeckoMatcher: Fetching market data batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(coinIds.length / batchSize)}...`);

        const response = await axios.get(`${this.COINGECKO_BASE_URL}/coins/markets`, {
          params: {
            x_cg_demo_api_key: apiKey,
            vs_currency: 'usd',
            ids: idsString,
            order: 'market_cap_desc',
            per_page: 250,
            sparkline: false
          },
          timeout: 30000
        });

        allMarketData.push(...response.data);

        // Rate limiting
        if (i + batchSize < coinIds.length) {
          await new Promise(resolve => setTimeout(resolve, 1200));
        }
      } catch (error) {
        logger.error(`BinanceCoinGeckoMatcher: Error fetching batch ${Math.floor(i / batchSize) + 1}:`, error);
      }
    }

    return allMarketData;
  }

  /**
   * Parse symbol and multiplier (handles symbols like 1000FLOKI)
   */
  private parseSymbolAndMultiplier(binanceSymbol: string): { symbol: string; multiplier: number } {
    // Check for prefix numbers (e.g., "1000FLOKI")
    let match = binanceSymbol.match(/^(10+)([A-Z]+)$/);
    if (match) {
      return {
        symbol: match[2],
        multiplier: parseInt(match[1], 10)
      };
    }

    // Check for suffix numbers
    match = binanceSymbol.match(/^([A-Z]+)(\d+)$/);
    if (match) {
      const number = parseInt(match[2], 10);
      // Small numbers (1-9) are version numbers, not multipliers
      if (number < 10) {
        return {
          symbol: match[1],
          multiplier: 1
        };
      }
      // Powers of 10 are multipliers
      if (number === 10 || number === 100 || number === 1000 || number === 10000) {
        return {
          symbol: match[1],
          multiplier: number
        };
      }
    }

    return {
      symbol: binanceSymbol,
      multiplier: 1
    };
  }

  /**
   * Find best CoinGecko match for a Binance symbol
   */
  private findBestMatch(
    baseAsset: string,
    binancePrice: number,
    coinsList: CoinListItem[],
    marketDataMap: Map<string, CoinGeckoMarketData>
  ): CoinGeckoMarketData | null {
    const { symbol: baseSymbol, multiplier } = this.parseSymbolAndMultiplier(baseAsset);
    const scaledPrice = binancePrice / multiplier;

    // Find coins with matching symbol
    const symbolMatches = coinsList.filter(
      coin => coin.symbol.toLowerCase() === baseSymbol.toLowerCase()
    );

    if (symbolMatches.length === 0) return null;

    // If single match, return it
    if (symbolMatches.length === 1) {
      return marketDataMap.get(symbolMatches[0].id) || null;
    }

    // Multiple matches - use price to find best match
    let bestMatch: CoinGeckoMarketData | null = null;
    let bestPriceScore = 0;

    for (const coin of symbolMatches) {
      const marketData = marketDataMap.get(coin.id);
      if (marketData) {
        const priceRatio = Math.min(scaledPrice, marketData.current_price) /
                          Math.max(scaledPrice, marketData.current_price);

        if (priceRatio > bestPriceScore) {
          bestPriceScore = priceRatio;
          bestMatch = marketData;
        }
      }
    }

    return bestMatch;
  }

  /**
   * Run the matching process
   */
  async runMatching(): Promise<{ matched: number; unmatched: number; data?: MatchedSymbol[] }> {
    if (this.isRunning) {
      throw new Error('Matching process is already running');
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      logger.info('BinanceCoinGeckoMatcher: Starting matching process...');

      // Fetch all required data
      const [spotSymbols, futuresSymbols, spotPrices, futuresPrices, coinsList] = await Promise.all([
        this.fetchBinanceSpotSymbols(),
        this.fetchBinanceFuturesSymbols(),
        this.fetchBinancePrices(true),
        this.fetchBinancePrices(false),
        this.fetchCoinGeckoList()
      ]);

      // Collect unique base assets
      const uniqueBaseAssets = new Set<string>();
      spotSymbols.forEach(s => uniqueBaseAssets.add(s.baseAsset));
      futuresSymbols.forEach(s => uniqueBaseAssets.add(s.baseAsset));

      // Remove stablecoins
      ['USDT', 'USDC', 'BUSD', 'TUSD', 'DAI', 'FDUSD', 'USDP'].forEach(stable => uniqueBaseAssets.delete(stable));

      // Find potential CoinGecko matches
      const potentialMatches = new Set<string>();
      for (const baseAsset of uniqueBaseAssets) {
        const { symbol } = this.parseSymbolAndMultiplier(baseAsset);
        const matches = coinsList.filter(
          coin => coin.symbol.toLowerCase() === symbol.toLowerCase()
        );
        matches.forEach(m => potentialMatches.add(m.id));
      }

      // Fetch market data for potential matches
      const marketData = await this.fetchCoinGeckoMarketData(Array.from(potentialMatches));
      const marketDataMap = new Map<string, CoinGeckoMarketData>();
      marketData.forEach(data => marketDataMap.set(data.id, data));

      // Process matches
      const matchedSymbols: MatchedSymbol[] = [];
      const processedBaseAssets = new Set<string>();
      let unmatchedCount = 0;

      // Process spot symbols
      for (const symbol of spotSymbols) {
        if (['USDT', 'USDC', 'BUSD', 'TUSD', 'DAI', 'FDUSD', 'USDP'].includes(symbol.baseAsset)) {
          continue;
        }

        if (processedBaseAssets.has(symbol.baseAsset)) {
          continue;
        }

        const binancePrice = spotPrices.get(symbol.symbol);
        if (!binancePrice || binancePrice === 0) continue;

        const match = this.findBestMatch(symbol.baseAsset, binancePrice, coinsList, marketDataMap);

        if (match) {
          processedBaseAssets.add(symbol.baseAsset);
          matchedSymbols.push({
            binanceSymbol: symbol.symbol,
            baseAsset: symbol.baseAsset,
            quoteAsset: symbol.quoteAsset,
            marketType: 'spot',
            binancePrice,
            coingeckoId: match.id,
            coingeckoSymbol: match.symbol,
            coingeckoName: match.name,
            coingeckoPrice: match.current_price,
            priceMatchScore: Math.min(binancePrice, match.current_price) / Math.max(binancePrice, match.current_price),
            marketCap: match.market_cap,
            marketCapRank: match.market_cap_rank,
            volume24h: match.total_volume,
            circulatingSupply: match.circulating_supply,
            totalSupply: match.total_supply || null,
            maxSupply: match.max_supply || null,
            timestamp: new Date()
          });
        } else {
          unmatchedCount++;
        }
      }

      // Process futures symbols (only if not already matched in spot)
      for (const symbol of futuresSymbols) {
        if (processedBaseAssets.has(symbol.baseAsset)) continue;
        if (['USDT', 'USDC', 'BUSD', 'TUSD', 'DAI', 'FDUSD', 'USDP'].includes(symbol.baseAsset)) continue;

        const binancePrice = futuresPrices.get(symbol.symbol);
        if (!binancePrice || binancePrice === 0) continue;

        const match = this.findBestMatch(symbol.baseAsset, binancePrice, coinsList, marketDataMap);

        if (match) {
          processedBaseAssets.add(symbol.baseAsset);
          matchedSymbols.push({
            binanceSymbol: symbol.symbol,
            baseAsset: symbol.baseAsset,
            quoteAsset: symbol.quoteAsset,
            marketType: 'futures',
            binancePrice,
            coingeckoId: match.id,
            coingeckoSymbol: match.symbol,
            coingeckoName: match.name,
            coingeckoPrice: match.current_price,
            priceMatchScore: Math.min(binancePrice, match.current_price) / Math.max(binancePrice, match.current_price),
            marketCap: match.market_cap,
            marketCapRank: match.market_cap_rank,
            volume24h: match.total_volume,
            circulatingSupply: match.circulating_supply,
            totalSupply: match.total_supply || null,
            maxSupply: match.max_supply || null,
            timestamp: new Date()
          });
        } else {
          unmatchedCount++;
        }
      }

      // Sort by market cap rank
      matchedSymbols.sort((a, b) => (a.marketCapRank || 999999) - (b.marketCapRank || 999999));

      // Save to database
      if (DatabaseConnection.isConnectionReady()) {
        const db = DatabaseConnection.getDatabase();
        const collection = db.collection('binance_coingecko_matches');

        // Clear old data
        await collection.deleteMany({});

        // Insert new matches
        if (matchedSymbols.length > 0) {
          await collection.insertMany(matchedSymbols);
        }

        logger.info(`BinanceCoinGeckoMatcher: Saved ${matchedSymbols.length} matches to database`);
      }

      // Generate CSV file
      const csvData = stringify(matchedSymbols, {
        header: true,
        columns: [
          'binanceSymbol',
          'baseAsset',
          'quoteAsset',
          'marketType',
          'binancePrice',
          'coingeckoId',
          'coingeckoSymbol',
          'coingeckoName',
          'coingeckoPrice',
          'priceMatchScore',
          'marketCap',
          'marketCapRank',
          'volume24h',
          'circulatingSupply',
          'totalSupply',
          'maxSupply'
        ]
      });

      // Save CSV file
      const outputDir = path.join(process.cwd(), 'output');
      await fs.mkdir(outputDir, { recursive: true });
      const outputPath = path.join(outputDir, 'binance-coingecko-matches.csv');
      await fs.writeFile(outputPath, csvData);

      const duration = Date.now() - startTime;
      this.lastRunDate = new Date();
      this.lastRunResult = {
        matched: matchedSymbols.length,
        unmatched: unmatchedCount,
        duration,
        outputPath
      };

      logger.info(`BinanceCoinGeckoMatcher: Completed - Matched: ${matchedSymbols.length}, Unmatched: ${unmatchedCount}, Duration: ${duration}ms`);

      return {
        matched: matchedSymbols.length,
        unmatched: unmatchedCount,
        data: matchedSymbols
      };

    } catch (error) {
      logger.error('BinanceCoinGeckoMatcher: Error during matching:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get latest matches from database
   */
  async getLatestMatches(limit: number = 100): Promise<MatchedSymbol[]> {
    if (!DatabaseConnection.isConnectionReady()) {
      await DatabaseConnection.initialize();
    }

    const db = DatabaseConnection.getDatabase();
    const collection = db.collection('binance_coingecko_matches');

    const matches = await collection
      .find({})
      .sort({ marketCapRank: 1 })
      .limit(limit)
      .toArray();

    return matches as unknown as MatchedSymbol[];
  }
}

export default BinanceCoinGeckoMatcher;