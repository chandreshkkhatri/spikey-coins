/**
 * DataManager
 * Central data storage and management for cryptocurrency ticker and candlestick data
 */
import logger from "../utils/logger.js";

interface TickerData {
  // Original Binance fields
  s: string;    // Symbol
  c: string;    // Close price
  o: string;    // Open price  
  h: string;    // High price
  l: string;    // Low price
  v: string;    // Volume
  q: string;    // Quote volume
  P: string;    // Price change percent
  p: string;    // Price change
  C: number;    // Close time
  O: number;    // Open time

  // Calculated fields
  price: number;
  change_24h: number;
  volume_usd: number;
  last_updated: string;
}

interface CandlestickData {
  symbol: string;
  openTime: number;
  closeTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  interval: string;
}

interface SymbolStats {
  symbol: string;
  volume24h: number;
  lastSeen: number;
  rank: number;
}

class DataManager {
  private static tickers: Map<string, TickerData> = new Map();
  private static candlesticks: Map<string, Map<string, CandlestickData[]>> = new Map(); // symbol -> interval -> data
  private static discoveredSymbols: Map<string, SymbolStats> = new Map();
  private static lastDiscoveryUpdate: number = 0;
  private static readonly DISCOVERY_UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private static readonly SYMBOL_EXPIRY_TIME = 30 * 60 * 1000; // 30 minutes
  private static readonly MIN_VOLUME_THRESHOLD = 1000;

  /**
   * Update ticker data from WebSocket stream
   */
  static updateTickers(tickerArray: any[]): void {
    const now = new Date().toISOString();
    const timestamp = Date.now();
    let newSymbolCount = 0;
    let updatedSymbolCount = 0;
    
    for (const rawTicker of tickerArray) {
      if (!rawTicker.s || !rawTicker.s.endsWith('USDT')) continue;
      
      const symbol = rawTicker.s;
      const price = parseFloat(rawTicker.c);
      const volume = parseFloat(rawTicker.v);
      const volume24h = parseFloat(rawTicker.q) || 0;
      
      // Skip low volume pairs
      if (volume24h < this.MIN_VOLUME_THRESHOLD) continue;
      
      const ticker: TickerData = {
        // Original fields
        s: symbol,
        c: rawTicker.c,
        o: rawTicker.o,
        h: rawTicker.h,
        l: rawTicker.l,
        v: rawTicker.v,
        q: rawTicker.q,
        P: rawTicker.P,
        p: rawTicker.p,
        C: rawTicker.C,
        O: rawTicker.O,
        
        // Calculated fields
        price,
        change_24h: parseFloat(rawTicker.P),
        volume_usd: volume * price,
        last_updated: now,
      };
      
      this.tickers.set(symbol, ticker);
      
      // Update discovery tracking
      const existing = this.discoveredSymbols.get(symbol);
      if (existing) {
        existing.volume24h = volume24h;
        existing.lastSeen = timestamp;
        updatedSymbolCount++;
      } else {
        this.discoveredSymbols.set(symbol, {
          symbol,
          volume24h,
          lastSeen: timestamp,
          rank: 0, // Will be calculated
        });
        newSymbolCount++;
      }
    }
    
    // Clean up expired symbols and update rankings
    this.cleanupExpiredSymbols(timestamp);
    this.updateSymbolRankings();
    
    // Log discovery updates periodically
    if (timestamp - this.lastDiscoveryUpdate > this.DISCOVERY_UPDATE_INTERVAL) {
      const totalSymbols = this.discoveredSymbols.size;
      logger.info(`DataManager: Discovered ${totalSymbols} active USDT symbols (${newSymbolCount} new, ${updatedSymbolCount} updated)`);
      this.lastDiscoveryUpdate = timestamp;
    }
    
    logger.debug(`DataManager: Updated ${tickerArray.length} tickers, tracking ${this.tickers.size} symbols`);
  }

  /**
   * Update candlestick data
   */
  static updateCandlesticks(symbol: string, candlestickArray: any[], interval: string = '15m'): void {
    const candlesticks = candlestickArray.map(candle => ({
      symbol,
      openTime: candle[0],
      closeTime: candle[6],
      open: candle[1],
      high: candle[2], 
      low: candle[3],
      close: candle[4],
      volume: candle[5],
      interval,
    }));
    
    // Ensure symbol entry exists
    if (!this.candlesticks.has(symbol)) {
      this.candlesticks.set(symbol, new Map());
    }
    
    // Store data for the specific interval
    this.candlesticks.get(symbol)!.set(interval, candlesticks);
    logger.debug(`DataManager: Updated ${candlesticks.length} candlesticks for ${symbol} (${interval})`);
  }

  /**
   * Get all ticker data
   */
  static getAllTickers(): TickerData[] {
    return Array.from(this.tickers.values())
      .sort((a, b) => b.volume_usd - a.volume_usd);
  }

  /**
   * Get candlestick data for a symbol and interval
   */
  static getCandlesticks(symbol: string, interval: string = '15m'): CandlestickData[] {
    const symbolData = this.candlesticks.get(symbol);
    if (!symbolData) return [];
    return symbolData.get(interval) || [];
  }

  /**
   * Get ticker data for a specific symbol
   */
  static getTickerBySymbol(symbol: string): TickerData | null {
    return this.tickers.get(symbol.toUpperCase()) || null;
  }

  /**
   * Get candlestick summary
   */
  static getCandlestickSummary() {
    const summary: any[] = [];
    this.candlesticks.forEach((intervalMap, symbol) => {
      const intervals: any = {};
      let totalCandles = 0;
      let latestTime = 0;
      
      intervalMap.forEach((candles, interval) => {
        intervals[interval] = {
          candleCount: candles.length,
          latestTime: candles.length > 0 ? candles[candles.length - 1].closeTime : 0,
        };
        totalCandles += candles.length;
        if (intervals[interval].latestTime > latestTime) {
          latestTime = intervals[interval].latestTime;
        }
      });
      
      summary.push({
        symbol,
        intervals,
        totalCandles,
        latestTime,
      });
    });
    return summary;
  }

  /**
   * Get statistics
   */
  static getStats() {
    return {
      tickerCount: this.tickers.size,
      candlestickSymbols: this.candlesticks.size,
      discoveredSymbols: this.discoveredSymbols.size,
    };
  }

  /**
   * Get discovery statistics (like SymbolDiscoveryService)
   */
  static getDiscoveryStats() {
    const symbols = Array.from(this.discoveredSymbols.values());
    const avgVolume = symbols.length > 0 
      ? symbols.reduce((sum, info) => sum + info.volume24h, 0) / symbols.length 
      : 0;

    return {
      totalSymbols: symbols.length,
      lastUpdate: this.lastDiscoveryUpdate,
      topSymbols: this.getTopSymbolsByVolume(20),
      avgVolume: Math.round(avgVolume),
      minVolumeThreshold: this.MIN_VOLUME_THRESHOLD,
      symbolExpiryTime: this.SYMBOL_EXPIRY_TIME,
    };
  }

  /**
   * Get top symbols by volume
   */
  static getTopSymbolsByVolume(count: number): string[] {
    return Array.from(this.discoveredSymbols.values())
      .sort((a, b) => b.volume24h - a.volume24h)
      .slice(0, count)
      .map(info => info.symbol);
  }

  /**
   * Get storage statistics (simulated for in-memory)
   */
  static getStorageStats() {
    let totalCandles = 0;
    let totalSymbols = 0;
    const intervalStats: any = {};

    this.candlesticks.forEach((intervalMap, symbol) => {
      totalSymbols++;
      intervalMap.forEach((candles, interval) => {
        totalCandles += candles.length;
        if (!intervalStats[interval]) {
          intervalStats[interval] = { symbols: 0, candles: 0 };
        }
        intervalStats[interval].symbols++;
        intervalStats[interval].candles += candles.length;
      });
    });

    // Estimate memory usage (very rough)
    const estimatedSizeBytes = (totalCandles * 200) + (this.tickers.size * 500); // rough estimate
    
    return {
      metadata: {
        type: 'in-memory',
        persistent: false,
        note: 'Data is stored in memory only and will be lost on restart'
      },
      filesCount: 0, // No files for in-memory
      totalSizeBytes: estimatedSizeBytes,
      inMemory: {
        tickerSymbols: this.tickers.size,
        candlestickSymbols: totalSymbols,
        totalCandles,
        intervalStats,
      }
    };
  }

  /**
   * Remove symbols that haven't been seen recently
   */
  private static cleanupExpiredSymbols(now: number): void {
    let removedCount = 0;
    for (const [symbol, info] of this.discoveredSymbols.entries()) {
      if (now - info.lastSeen > this.SYMBOL_EXPIRY_TIME) {
        this.discoveredSymbols.delete(symbol);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      logger.debug(`DataManager: Removed ${removedCount} expired symbols`);
    }
  }

  /**
   * Update symbol rankings based on volume
   */
  private static updateSymbolRankings(): void {
    const symbols = Array.from(this.discoveredSymbols.values())
      .sort((a, b) => b.volume24h - a.volume24h);
    
    symbols.forEach((symbol, index) => {
      symbol.rank = index + 1;
    });
  }

  /**
   * Clear all data (for testing)
   */
  static clearAll(): void {
    this.tickers.clear();
    this.candlesticks.clear();
    this.discoveredSymbols.clear();
    this.lastDiscoveryUpdate = 0;
  }
}

export default DataManager;