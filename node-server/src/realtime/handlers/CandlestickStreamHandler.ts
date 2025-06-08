/**
 * CandlestickStreamHandler - Handles candlestick stream messages from Binance WebSocket
 */
import logger from "../../utils/logger.js";
import CandlestickRepository from "../../data/repositories/CandlestickRepository.js";
import type { Candlestick } from "../../data/models/Candlestick.js";

interface CandlestickStreamHandlerDependencies {
  candlestickRepository: typeof CandlestickRepository;
}

interface BinanceKlineData {
  t: number; // Kline start time
  T: number; // Kline close time
  s: string; // Symbol
  i: string; // Interval
  f: number; // First trade ID
  L: number; // Last trade ID
  o: string; // Open price
  c: string; // Close price
  h: string; // High price
  l: string; // Low price
  v: string; // Base asset volume
  n: number; // Number of trades
  x: boolean; // Is this kline closed?
  q: string; // Quote asset volume
  V: string; // Taker buy base asset volume
  Q: string; // Taker buy quote asset volume
  B: string; // Ignore
}

interface BinanceKlineMessage {
  e: string; // Event type
  E: number; // Event time
  s: string; // Symbol
  k: BinanceKlineData;
}

class CandlestickStreamHandler {
  private candlestickRepository: typeof CandlestickRepository;

  constructor({ candlestickRepository }: CandlestickStreamHandlerDependencies) {
    this.candlestickRepository = candlestickRepository;
  }

  /**
   * Handles incoming kline (candlestick) messages from Binance WebSocket.
   * @param klineMessage - Kline object from Binance.
   * Example message structure:
   * {
   *   "e": "kline",        // Event type
   *   "E": 1672515782136,    // Event time
   *   "s": "BNBBTC",       // Symbol
   *   "k": {
   *     "t": 1672515780000,  // Kline start time
   *     "T": 1672515839999,  // Kline close time
   *     "s": "BNBBTC",     // Symbol
   *     "i": "1m",         // Interval
   *     "f": 100,            // First trade ID
   *     "L": 200,            // Last trade ID
   *     "o": "0.0010",     // Open price
   *     "c": "0.0020",     // Close price
   *     "h": "0.0025",     // High price
   *     "l": "0.0015",     // Low price
   *     "v": "1000",       // Base asset volume
   *     "n": 100,            // Number of trades
   *     "x": false,          // Is this kline closed?
   *     "q": "1.0000",     // Quote asset volume
   *     "V": "500",        // Taker buy base asset volume
   *     "Q": "0.500",      // Taker buy quote asset volume
   *     "B": "123456"      // Ignore
   *   }
   * }
   */
  handleMessage(klineMessage: BinanceKlineMessage): void {
    if (!klineMessage || !klineMessage.k) {
      logger.warn(
        "CandlestickStreamHandler: Invalid kline message received",
        klineMessage
      );
      return;
    }

    const klineData = klineMessage.k;

    const candlestick: Candlestick = {
      openTime: klineData.t,
      open: parseFloat(klineData.o),
      high: parseFloat(klineData.h),
      low: parseFloat(klineData.l),
      close: parseFloat(klineData.c),
      volume: parseFloat(klineData.v),
      closeTime: klineData.T,
      quoteAssetVolume: parseFloat(klineData.q),
      numberOfTrades: klineData.n,
      takerBuyBaseAssetVolume: parseFloat(klineData.V),
      takerBuyQuoteAssetVolume: parseFloat(klineData.Q),
      isClosed: klineData.x, // Important: only append if closed, or handle updates to open candle
    };

    const symbol = klineData.s.toLowerCase(); // Normalize symbol
    const interval = klineData.i;

    // logger.debug(`CandlestickStreamHandler: Received kline for ${symbol} - ${interval}. Is closed: ${candlestick.isClosed}`);    // The Binance stream sends updates for the current (not yet closed) candlestick.
    // It also sends a final update when the candlestick is closed (klineData.x === true).
    // We should append/update the candlestick in the repository.
    // The CandlestickRepository.appendCandlestick method should handle if it needs to update the last candle or add a new one.
    CandlestickRepository.appendCandlestick(symbol, interval, candlestick);

    // Optional: If only closed candles are desired for some operations, filter here or in repository
    // if (candlestick.isClosed) { ... }
  }

  /**
   * Returns the stream names this handler is interested in.
   * This would be dynamically generated based on MAJOR_SYMBOLS and desired intervals.
   * For this example, we assume the BinanceStreamManager will construct these.
   * @returns An empty array, as stream names are determined by BinanceStreamManager.
   */
  getStreamNames(): string[] {
    // This method might not be strictly needed if BinanceStreamManager itself constructs the stream names
    // based on constants and passes messages directly. However, it can be useful for introspection or
    // if handlers were to dynamically subscribe/unsubscribe.
    return []; // The actual stream names are like `symbol@kline_interval`
  }
}

export default CandlestickStreamHandler;
