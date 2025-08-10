/**
 * BinanceClient
 * Handles WebSocket connections and real-time data streaming from Binance API
 */
import WebSocket from "ws";
import axios from "axios";
import logger from "../utils/logger.js";
import DataManager from "./DataManager.js";

class BinanceClient {
  private tickerWs: WebSocket | null = null;
  private candlestickConnections: Map<string, WebSocket> = new Map();
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private readonly maxReconnectAttempts: number = 5;

  /**
   * Start all connections
   */
  async start(): Promise<void> {
    logger.info("BinanceClient: Starting connections...");
    
    // Start ticker stream
    this.connectTickerStream();
    
    // Wait a bit then start candlestick streams for major pairs
    setTimeout(() => {
      this.startCandlestickStreams();
    }, 2000);
    
    // Initialize historical data
    setTimeout(() => {
      this.initializeHistoricalData();
    }, 5000);
  }

  /**
   * Connect to Binance 24hr ticker stream
   */
  private connectTickerStream(): void {
    const wsUrl = 'wss://stream.binance.com:9443/ws/!ticker@arr';
    
    this.tickerWs = new WebSocket(wsUrl);
    
    this.tickerWs.on('open', () => {
      logger.info("BinanceClient: Ticker WebSocket connected");
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });
    
    this.tickerWs.on('message', (data: Buffer) => {
      try {
        const tickerArray = JSON.parse(data.toString());
        if (Array.isArray(tickerArray)) {
          DataManager.updateTickers(tickerArray);
        }
      } catch (error) {
        logger.error("BinanceClient: Error processing ticker data:", error);
      }
    });
    
    this.tickerWs.on('close', () => {
      logger.warn("BinanceClient: Ticker WebSocket disconnected");
      this.isConnected = false;
      this.handleReconnect();
    });
    
    this.tickerWs.on('error', (error) => {
      logger.error("BinanceClient: Ticker WebSocket error:", error);
    });
  }

  /**
   * Start candlestick streams for major pairs
   */
  private startCandlestickStreams(): void {
    const majorPairs = [
      "BTCUSDT", "ETHUSDT", "BNBUSDT", "ADAUSDT", 
      "SOLUSDT", "XRPUSDT", "DOGEUSDT", "AVAXUSDT"
    ];
    
    for (const symbol of majorPairs) {
      this.connectCandlestickStream(symbol);
    }
  }

  /**
   * Connect to candlestick stream for a symbol
   */
  private connectCandlestickStream(symbol: string): void {
    const stream = symbol.toLowerCase() + '@kline_15m';
    const wsUrl = `wss://stream.binance.com:9443/ws/${stream}`;
    
    const ws = new WebSocket(wsUrl);
    
    ws.on('open', () => {
      logger.info(`BinanceClient: Candlestick stream connected for ${symbol}`);
    });
    
    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.k) {
          const kline = message.k;
          // Store individual candlestick update
          const candleData = [
            kline.t, // open time
            kline.o, // open
            kline.h, // high
            kline.l, // low
            kline.c, // close
            kline.v, // volume
            kline.T  // close time
          ];
          // For real-time updates, we could update individual candles
          // For now, we'll rely on historical data initialization
        }
      } catch (error) {
        logger.error(`BinanceClient: Error processing candlestick data for ${symbol}:`, error);
      }
    });
    
    ws.on('close', () => {
      logger.warn(`BinanceClient: Candlestick stream disconnected for ${symbol}`);
      this.candlestickConnections.delete(symbol);
    });
    
    this.candlestickConnections.set(symbol, ws);
  }

  /**
   * Initialize historical candlestick data for multiple intervals
   */
  private async initializeHistoricalData(): Promise<void> {
    const majorPairs = [
      "BTCUSDT", "ETHUSDT", "BNBUSDT", "ADAUSDT",
      "SOLUSDT", "XRPUSDT", "DOGEUSDT", "AVAXUSDT"
    ];
    
    const intervals = [
      { interval: '1m', limit: 60 },
      { interval: '5m', limit: 144 },
      { interval: '15m', limit: 48 },
      { interval: '30m', limit: 48 },
      { interval: '1h', limit: 24 },
    ];
    
    for (const symbol of majorPairs) {
      for (const { interval, limit } of intervals) {
        try {
          await this.fetchHistoricalCandlesticks(symbol, interval, limit);
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          logger.error(`BinanceClient: Failed to fetch historical data for ${symbol} (${interval}):`, error);
        }
      }
    }
  }

  /**
   * Fetch historical candlestick data
   */
  private async fetchHistoricalCandlesticks(symbol: string, interval: string = '15m', limit: number = 48): Promise<void> {
    const url = `https://api.binance.com/api/v3/klines`;
    const params = {
      symbol,
      interval,
      limit,
    };
    
    try {
      const response = await axios.get(url, { params, timeout: 10000 });
      if (response.data && Array.isArray(response.data)) {
        DataManager.updateCandlesticks(symbol, response.data, interval);
      }
    } catch (error) {
      logger.error(`BinanceClient: Error fetching candlesticks for ${symbol} (${interval}):`, error);
    }
  }

  /**
   * Handle reconnection logic
   */
  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error("BinanceClient: Max reconnection attempts reached");
      return;
    }
    
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    logger.info(`BinanceClient: Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.connectTickerStream();
    }, delay);
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      candlestickConnections: this.candlestickConnections.size,
    };
  }

  /**
   * Cleanup connections
   */
  cleanup(): void {
    if (this.tickerWs) {
      this.tickerWs.close();
    }
    
    this.candlestickConnections.forEach((ws) => {
      ws.close();
    });
    
    this.candlestickConnections.clear();
    logger.info("BinanceClient: Cleaned up all connections");
  }
}

export default BinanceClient;