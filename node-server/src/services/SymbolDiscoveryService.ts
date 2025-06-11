/**
 * SymbolDiscoveryService
 * Dynamically discovers available trading symbols from live ticker data
 * and manages the list of symbols for candlestick data collection.
 */
import logger from "../utils/logger.js";

interface SymbolInfo {
  symbol: string;
  volume24h: number;
  lastSeen: number;
}

class SymbolDiscoveryService {
  private static availableSymbols: Map<string, SymbolInfo> = new Map();
  private static lastDiscoveryUpdate: number = 0;
  private static readonly DISCOVERY_UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private static readonly SYMBOL_EXPIRY_TIME = 30 * 60 * 1000; // 30 minutes
  private static readonly MIN_VOLUME_THRESHOLD = 1000; // Minimum 24h volume USD

  /**
   * Updates available symbols from ticker data received via WebSocket
   */
  static updateFromTickerData(tickerArray: any[]): void {
    const now = Date.now();
    let newSymbolCount = 0;
    let updatedSymbolCount = 0;

    for (const ticker of tickerArray) {
      const symbol = ticker.s;
      if (!symbol || !symbol.endsWith('USDT')) {
        continue; // Only process USDT pairs
      }

      // Calculate volume in USD (already in USDT for USDT pairs)
      const volume24h = parseFloat(ticker.q) || 0;
      
      // Skip symbols with very low volume to avoid inactive pairs
      if (volume24h < this.MIN_VOLUME_THRESHOLD) {
        continue;
      }

      const existing = this.availableSymbols.get(symbol);
      if (existing) {
        existing.volume24h = volume24h;
        existing.lastSeen = now;
        updatedSymbolCount++;
      } else {
        this.availableSymbols.set(symbol, {
          symbol,
          volume24h,
          lastSeen: now,
        });
        newSymbolCount++;
      }
    }

    // Clean up expired symbols (not seen in a while)
    this.cleanupExpiredSymbols(now);

    // Log discovery updates periodically
    if (now - this.lastDiscoveryUpdate > this.DISCOVERY_UPDATE_INTERVAL) {
      const totalSymbols = this.availableSymbols.size;
      logger.info(`SymbolDiscoveryService: Discovered ${totalSymbols} active USDT symbols (${newSymbolCount} new, ${updatedSymbolCount} updated)`);
      this.lastDiscoveryUpdate = now;
      
      // Log top 10 by volume for debugging
      const topSymbols = this.getTopSymbolsByVolume(10);
      logger.debug(`SymbolDiscoveryService: Top symbols by volume: ${topSymbols.join(', ')}`);
    }
  }

  /**
   * Gets all discovered USDT symbols sorted by 24h volume (highest first)
   */
  static getDiscoveredUSDTSymbols(): string[] {
    return Array.from(this.availableSymbols.values())
      .sort((a, b) => b.volume24h - a.volume24h)
      .map(info => info.symbol);
  }

  /**
   * Gets top N symbols by volume
   */
  static getTopSymbolsByVolume(count: number): string[] {
    return this.getDiscoveredUSDTSymbols().slice(0, count);
  }

  /**
   * Gets symbols with volume above a certain threshold
   */
  static getSymbolsAboveVolume(minVolume: number): string[] {
    return Array.from(this.availableSymbols.values())
      .filter(info => info.volume24h >= minVolume)
      .sort((a, b) => b.volume24h - a.volume24h)
      .map(info => info.symbol);
  }

  /**
   * Checks if a symbol is available and active
   */
  static isSymbolAvailable(symbol: string): boolean {
    return this.availableSymbols.has(symbol);
  }

  /**
   * Gets discovery statistics
   */
  static getDiscoveryStats(): {
    totalSymbols: number;
    lastUpdate: number;
    topSymbols: string[];
    avgVolume: number;
  } {
    const symbols = Array.from(this.availableSymbols.values());
    const avgVolume = symbols.length > 0 
      ? symbols.reduce((sum, info) => sum + info.volume24h, 0) / symbols.length 
      : 0;

    return {
      totalSymbols: symbols.length,
      lastUpdate: this.lastDiscoveryUpdate,
      topSymbols: this.getTopSymbolsByVolume(20),
      avgVolume: Math.round(avgVolume),
    };
  }

  /**
   * Removes symbols that haven't been seen recently
   */
  private static cleanupExpiredSymbols(now: number): void {
    let removedCount = 0;
    for (const [symbol, info] of this.availableSymbols.entries()) {
      if (now - info.lastSeen > this.SYMBOL_EXPIRY_TIME) {
        this.availableSymbols.delete(symbol);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      logger.debug(`SymbolDiscoveryService: Removed ${removedCount} expired symbols`);
    }
  }

  /**
   * Force clears all discovered symbols (for testing)
   */
  static clearAll(): void {
    this.availableSymbols.clear();
    this.lastDiscoveryUpdate = 0;
    logger.info("SymbolDiscoveryService: Cleared all discovered symbols");
  }
}

export default SymbolDiscoveryService; 