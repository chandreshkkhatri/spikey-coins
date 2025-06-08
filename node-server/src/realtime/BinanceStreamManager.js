\
import WebSocket from 'ws';
import logger from '../utils/logger.js';
import { BINANCE_WS_BASE_URL, MAJOR_SYMBOLS, CANDLESTICK_INTERVALS } from '../config/constants.js';

const RECONNECT_DELAY_MS = 5000; // 5 seconds

/**
 * @typedef {import('../data/repositories/CandlestickRepository.js').default} CandlestickRepository
 * @typedef {import('../services/MarketDataService.js').default} MarketDataService
 * @typedef {import('../services/DataSyncService.js').default} DataSyncService
 */

/**
 * @typedef {Object} StreamHandler
 * @property {(message: Object) => void} handleMessage - Function to process a message from this stream.
 * @property {() => string[]} getStreamNames - Function that returns the stream names this handler is interested in.
 */

class BinanceStreamManager {
  /** @type {WebSocket | null} */
  ws = null;
  /** @type {string} */
  baseUrl = BINANCE_WS_BASE_URL;
  /** @type {Map<string, (message: Object) => void>} */
  messageHandlers = new Map(); // Maps stream names to handler functions
  /** @type {boolean} */
  isConnecting = false;
  /** @type {boolean} */
  explicitlyClosed = false;
  /** @type {NodeJS.Timeout | null} */
  reconnectTimeoutId = null;

  /**
   * @param {Object} dependencies
   * @param {CandlestickRepository} dependencies.candlestickRepository
   * @param {MarketDataService} dependencies.marketDataService
   * @param {DataSyncService} dependencies.dataSyncService
   * @param {import('./handlers/TickerStreamHandler.js').default} dependencies.tickerStreamHandler
   * @param {import('./handlers/CandlestickStreamHandler.js').default} dependencies.candlestickStreamHandler
   */
  constructor({ tickerStreamHandler, candlestickStreamHandler }) {
    this.tickerStreamHandler = tickerStreamHandler;
    this.candlestickStreamHandler = candlestickStreamHandler;
    this._initializeMessageHandlers();
  }

  _initializeMessageHandlers() {
    // General ticker stream
    this.messageHandlers.set('!ticker@arr', (message) => this.tickerStreamHandler.handleMessage(message));

    // Candlestick streams for major symbols and defined intervals
    MAJOR_SYMBOLS.forEach(symbol => {
      CANDLESTICK_INTERVALS.forEach(interval => {
        // We only subscribe to 1m for real-time updates as per original logic
        if (interval === '1m') {
          const streamName = `${symbol.toLowerCase()}@kline_${interval}`;
          this.messageHandlers.set(streamName, (message) => this.candlestickStreamHandler.handleMessage(message));
        }
      });
    });
  }

  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      logger.info('BinanceStreamManager: WebSocket is already connected.');
      return;
    }
    if (this.isConnecting) {
      logger.info('BinanceStreamManager: WebSocket connection attempt already in progress.');
      return;
    }

    this.isConnecting = true;
    this.explicitlyClosed = false;
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }

    const streamNames = Array.from(this.messageHandlers.keys());
    if (streamNames.length === 0) {
      logger.warn('BinanceStreamManager: No streams to subscribe to.');
      this.isConnecting = false;
      return;
    }

    const streamsQueryParam = streamNames.join('/');
    const wsUrl = `${this.baseUrl}/stream?streams=${streamsQueryParam}`;

    logger.info(`BinanceStreamManager: Connecting to ${wsUrl}`);
    this.ws = new WebSocket(wsUrl);

    this.ws.on('open', () => {
      this.isConnecting = false;
      logger.info('BinanceStreamManager: WebSocket connection established.');
      // Reset reconnect attempts on successful connection if implementing exponential backoff
    });

    this.ws.on('message', (data) => {
      try {
        const messageString = data.toString();
        const parsedMessage = JSON.parse(messageString);

        if (parsedMessage.stream && this.messageHandlers.has(parsedMessage.stream)) {
          const handler = this.messageHandlers.get(parsedMessage.stream);
          if (handler) {
            handler(parsedMessage.data);
          }
        } else if (parsedMessage.result === null && parsedMessage.id !== undefined) {
          // This is a response to a subscription/unsubscription request
          logger.info(`BinanceStreamManager: Received subscription response: ${messageString}`);
        } else {
          logger.warn(\`BinanceStreamManager: No handler for stream or unknown message format: ${parsedMessage.stream || messageString}\`);
        }
      } catch (error) {
        logger.error(\`BinanceStreamManager: Error processing message: ${error.message}\`, { data });
      }
    });

    this.ws.on('error', (error) => {
      this.isConnecting = false;
      logger.error(\`BinanceStreamManager: WebSocket error: ${error.message}\`);
      // Reconnection is handled by the 'close' event
    });

    this.ws.on('close', (code, reason) => {
      this.isConnecting = false;
      logger.info(\`BinanceStreamManager: WebSocket connection closed. Code: ${code}, Reason: ${reason ? reason.toString() : 'N/A'}\`);
      this.ws = null;
      if (!this.explicitlyClosed) {
        this.scheduleReconnect();
      }
    });
  }

  scheduleReconnect() {
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
    }
    logger.info(\`BinanceStreamManager: Scheduling reconnection in ${RECONNECT_DELAY_MS / 1000} seconds.\`);
    this.reconnectTimeoutId = setTimeout(() => {
      this.connect();
    }, RECONNECT_DELAY_MS);
  }

  disconnect() {
    this.explicitlyClosed = true;
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
    if (this.ws) {
      logger.info('BinanceStreamManager: Disconnecting WebSocket.');
      this.ws.close();
    }
  }

  // Methods for dynamic subscription management (optional, based on requirements)
  // subscribeToStreams(streams) { ... }
  // unsubscribeFromStreams(streams) { ... }
}

export default BinanceStreamManager;
\'
