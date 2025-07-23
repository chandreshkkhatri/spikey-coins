/**
 * BinanceTickerManager - Handles WebSocket connections to Binance streams
 */
import WebSocket from "ws";
import logger from "../utils/logger.js";
import {
  BINANCE_WS_BASE_URL,
  MAJOR_SYMBOLS,
  CANDLESTICK_INTERVALS,
} from "../config/constants.js";
import type TickerStreamHandler from "./handlers/TickerStreamHandler.js";
import type CandlestickStreamHandler from "./handlers/CandlestickStreamHandler.js";

const RECONNECT_DELAY_MS = 5000; // 5 seconds

interface BinanceMessage {
  stream?: string;
  data?: any;
  result?: any;
  id?: number;
}

interface BinanceTickerManagerDependencies {
  tickerStreamHandler: TickerStreamHandler;
  candlestickStreamHandler?: CandlestickStreamHandler;
}

type MessageHandler = (message: any) => void;

class BinanceTickerManager {
  private ws: WebSocket | null = null;
  private baseUrl: string = BINANCE_WS_BASE_URL;
  private messageHandlers: Map<string, MessageHandler> = new Map();
  private isConnecting: boolean = false;
  private explicitlyClosed: boolean = false;
  private reconnectTimeoutId: NodeJS.Timeout | null = null;
  private tickerStreamHandler: TickerStreamHandler;
  private candlestickStreamHandler?: CandlestickStreamHandler;

  constructor({
    tickerStreamHandler,
    candlestickStreamHandler,
  }: BinanceTickerManagerDependencies) {
    this.tickerStreamHandler = tickerStreamHandler;
    this.candlestickStreamHandler = candlestickStreamHandler;
    this._initializeMessageHandlers();
  }

  private _initializeMessageHandlers(): void {
    // General ticker stream
    this.messageHandlers.set("!ticker@arr", (message) =>
      this.tickerStreamHandler.handleMessage(message)
    );

    // Candlestick streams only if handler is available
    if (this.candlestickStreamHandler) {
      MAJOR_SYMBOLS.forEach((symbol) => {
        Object.keys(CANDLESTICK_INTERVALS).forEach((interval) => {
          // We only subscribe to 1m for real-time updates as per original logic
          if (interval === "1m") {
            const streamName = `${symbol.toLowerCase()}@kline_${interval}`;
            this.messageHandlers.set(streamName, (message) =>
              this.candlestickStreamHandler!.handleMessage(message)
            );
          }
        });
      });
    }
  }

  connect(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      logger.info("BinanceTickerManager: WebSocket is already connected.");
      return;
    }
    if (this.isConnecting) {
      logger.info(
        "BinanceTickerManager: WebSocket connection attempt already in progress."
      );
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
      logger.warn("BinanceTickerManager: No streams to subscribe to.");
      this.isConnecting = false;
      return;
    }

    const streamsQueryParam = streamNames.join("/");
    const wsUrl = `${this.baseUrl}/stream?streams=${streamsQueryParam}`;

    logger.info(`BinanceTickerManager: Connecting to ${wsUrl}`);
    this.ws = new WebSocket(wsUrl);

    this.ws.on("open", () => {
      this.isConnecting = false;
      logger.info("✅ BinanceTickerManager: WebSocket connection established.");
      // Reset reconnect attempts on successful connection if implementing exponential backoff
    });

    this.ws.on("message", (data: WebSocket.Data) => {
      logger.debug(`[WS Message]: ${data.toString().substring(0, 300)}`);
      try {
        const messageString = data.toString();
        const parsedMessage: BinanceMessage = JSON.parse(messageString);

        if (
          parsedMessage.stream &&
          this.messageHandlers.has(parsedMessage.stream)
        ) {
          const handler = this.messageHandlers.get(parsedMessage.stream);
          if (handler) {
            handler(parsedMessage.data);
          }
        } else if (
          parsedMessage.result === null &&
          parsedMessage.id !== undefined
        ) {
          // This is a response to a subscription/unsubscription request
          logger.info(
            `BinanceTickerManager: Received subscription response: ${messageString}`
          );
        } else {
          logger.warn(
            `BinanceTickerManager: No handler for stream or unknown message format: ${
              parsedMessage.stream || messageString.substring(0, 200)
            }`
          );
        }
      } catch (error) {
        logger.error(
          `BinanceTickerManager: Error processing message: ${
            (error as Error).message
          }`,
          { data }
        );
      }
    });

    this.ws.on("error", (error: Error) => {
      this.isConnecting = false;
      logger.error(`❌ BinanceTickerManager: WebSocket error: ${error.message}`, {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
      // Reconnection is handled by the 'close' event
    });

    this.ws.on("close", (code: number, reason: Buffer) => {
      this.isConnecting = false;
      logger.info(
        `BinanceTickerManager: WebSocket connection closed. Code: ${code}, Reason: ${
          reason ? reason.toString() : "N/A"
        }`
      );
      this.ws = null;
      if (!this.explicitlyClosed) {
        this.scheduleReconnect();
      }
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
    }
    logger.info(
      `BinanceTickerManager: Scheduling reconnection in ${
        RECONNECT_DELAY_MS / 1000
      } seconds.`
    );
    this.reconnectTimeoutId = setTimeout(() => {
      this.connect();
    }, RECONNECT_DELAY_MS);
  }

  disconnect(): void {
    this.explicitlyClosed = true;
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
    if (this.ws) {
      logger.info("BinanceTickerManager: Disconnecting WebSocket.");
      this.ws.close();
    }
  }

  // Methods for dynamic subscription management (optional, based on requirements)
  // subscribeToStreams(streams: string[]): void { ... }
  // unsubscribeFromStreams(streams: string[]): void { ... }
}

export default BinanceTickerManager;
