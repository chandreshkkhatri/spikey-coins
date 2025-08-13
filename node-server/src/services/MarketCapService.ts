/**
 * MarketCapService
 * Loads and manages market cap data from CSV files
 */

import { readFileSync, existsSync, watchFile } from 'fs';
import logger from '../utils/logger.js';

interface MarketCapData {
  binanceSymbol: string;
  baseAsset: string;
  marketType: 'spot' | 'futures';
  marketCap?: number;
  coingeckoId?: string;
  coingeckoName?: string;
  volume24h?: number;
  circulatingSupply?: number;
  maxSupply?: number;
  priceChange24h?: number;
  priceChangePercentage24h?: number;
}

class MarketCapService {
  private static marketCapData: Map<string, MarketCapData> = new Map();
  private static csvPath = '/Users/chandreshkumar/Desktop/code/spikey-coins/admin-scripts/output/binance-coingecko-matches.csv';
  private static unmatchedPath = '/Users/chandreshkumar/Desktop/code/spikey-coins/admin-scripts/output/unmatched-symbols.json';
  private static lastUpdateTime: number = 0;
  private static updateInterval = 5 * 60 * 1000; // 5 minutes
  private static fileWatcher: any = null;

  /**
   * Initialize the service and load data
   */
  static async initialize(): Promise<void> {
    await this.loadMarketCapData();
    this.startFileWatcher();
    
    // Periodic reload
    setInterval(() => {
      this.loadMarketCapData();
    }, this.updateInterval);
  }

  /**
   * Load market cap data from CSV file
   */
  private static async loadMarketCapData(): Promise<void> {
    try {
      // Load matched symbols with market cap data
      if (existsSync(this.csvPath)) {
        const csvContent = readFileSync(this.csvPath, 'utf-8');
        const lines = csvContent.split('\n');
        const headers = lines[0].split(',');
        
        // Find column indices
        const indices = {
          binanceSymbol: headers.indexOf('binanceSymbol'),
          baseAsset: headers.indexOf('baseAsset'),
          marketType: headers.indexOf('marketType'),
          marketCap: headers.indexOf('marketCap'),
          coingeckoId: headers.indexOf('coingeckoId'),
          coingeckoName: headers.indexOf('coingeckoName'),
          volume24h: headers.indexOf('volume24h'),
          circulatingSupply: headers.indexOf('circulatingSupply'),
          maxSupply: headers.indexOf('maxSupply'),
          priceChange24h: headers.indexOf('priceChange24h'),
          priceChangePercentage24h: headers.indexOf('priceChangePercentage24h')
        };

        // Parse each row
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          // Use regex to properly parse CSV with quoted fields
          const values = this.parseCSVLine(line);
          
          if (values.length > indices.binanceSymbol) {
            const symbol = values[indices.binanceSymbol];
            const marketCap = parseFloat(values[indices.marketCap]);
            
            this.marketCapData.set(symbol, {
              binanceSymbol: symbol,
              baseAsset: values[indices.baseAsset],
              marketType: values[indices.marketType] as 'spot' | 'futures',
              marketCap: isNaN(marketCap) ? undefined : marketCap,
              coingeckoId: values[indices.coingeckoId],
              coingeckoName: values[indices.coingeckoName],
              volume24h: parseFloat(values[indices.volume24h]) || undefined,
              circulatingSupply: parseFloat(values[indices.circulatingSupply]) || undefined,
              maxSupply: parseFloat(values[indices.maxSupply]) || undefined,
              priceChange24h: parseFloat(values[indices.priceChange24h]) || undefined,
              priceChangePercentage24h: parseFloat(values[indices.priceChangePercentage24h]) || undefined
            });
          }
        }
      }

      // Load unmatched symbols (no market cap data)
      if (existsSync(this.unmatchedPath)) {
        const unmatchedContent = readFileSync(this.unmatchedPath, 'utf-8');
        const unmatchedSymbols = JSON.parse(unmatchedContent);
        
        for (const item of unmatchedSymbols) {
          if (!this.marketCapData.has(item.symbol)) {
            this.marketCapData.set(item.symbol, {
              binanceSymbol: item.symbol,
              baseAsset: item.baseAsset,
              marketType: item.marketType,
              marketCap: undefined
            });
          }
        }
      }

      this.lastUpdateTime = Date.now();
      logger.info(`MarketCapService: Loaded market cap data for ${this.marketCapData.size} symbols`);
      
    } catch (error) {
      logger.error('MarketCapService: Error loading market cap data:', error);
    }
  }

  /**
   * Parse CSV line handling quoted fields
   */
  private static parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current); // Add last field
    return result;
  }

  /**
   * Watch for file changes
   */
  private static startFileWatcher(): void {
    if (existsSync(this.csvPath)) {
      watchFile(this.csvPath, { interval: 60000 }, (curr, prev) => {
        if (curr.mtime !== prev.mtime) {
          logger.info('MarketCapService: CSV file changed, reloading data');
          this.loadMarketCapData();
        }
      });
    }
  }

  /**
   * Get market cap data for a symbol
   */
  static getMarketCapData(symbol: string): MarketCapData | undefined {
    return this.marketCapData.get(symbol);
  }

  /**
   * Get all symbols with their market types
   */
  static getAllSymbols(): Map<string, MarketCapData> {
    return this.marketCapData;
  }

  /**
   * Check if a symbol is available in futures market
   */
  static isFuturesAvailable(symbol: string): boolean {
    const data = this.marketCapData.get(symbol);
    return data?.marketType === 'futures' || false;
  }

  /**
   * Get top symbols by market cap
   */
  static getTopSymbolsByMarketCap(limit: number = 100): string[] {
    const symbolsWithMarketCap = Array.from(this.marketCapData.entries())
      .filter(([_, data]) => data.marketCap && data.marketCap > 0)
      .sort((a, b) => (b[1].marketCap || 0) - (a[1].marketCap || 0))
      .slice(0, limit)
      .map(([symbol]) => symbol);
    
    return symbolsWithMarketCap;
  }
}

export default MarketCapService;