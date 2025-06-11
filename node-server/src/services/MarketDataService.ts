/**
 * MarketDataService
 * Responsible for enriching ticker data with calculated short-term changes and additional metrics.
 */
import { Ticker } from "../data/models/Ticker.js";
import CandlestickRepository from "../data/repositories/CandlestickRepository.js";
import TickerRepository from "../data/repositories/TickerRepository.js";
import { CALCULATION_INTERVALS } from "../config/constants.js";
import logger from "../utils/logger.js";
import PriceCalculationService from "./PriceCalculationService.js";
import { calculateAdditionalMetrics } from "../utils/calculations.js";

interface RawBinanceTicker {
  s: string; // Symbol
  c: string; // Last price
  p: string; // Price change
  P: string; // Price change percent
  h: string; // High price
  l: string; // Low price
  v: string; // Total traded base asset volume
  q: string; // Total traded quote asset volume
  O: number; // Statistics open time
  C: number; // Statistics close time
  F: number; // First trade ID
  L: number; // Last trade ID
  n: number; // Total number of trades
}

class MarketDataService {
  /**
   * Processes a raw array of tickers from the WebSocket, enriches them
   * and other metrics, then updates the TickerRepository.
   *
   * @param rawTickerArray - Array of raw ticker objects from Binance WebSocket.
   */
  static processAndStoreEnrichedTickers(
    rawTickerArray: RawBinanceTicker[]
  ): void {
    if (!Array.isArray(rawTickerArray)) {
      logger.error(
        "MarketDataService.processAndStoreEnrichedTickers: rawTickerArray must be an array."
      );
      return;
    }

    const enrichedTickers = rawTickerArray
      .map((rawTicker) => this.enrichTickerData(rawTicker))
      .filter((ticker): ticker is Ticker => ticker !== null);

    TickerRepository.upsertTickers(enrichedTickers);
  }

  /**
   * Enriches a single raw ticker with calculated values and a standardized format.
   *
   * @param rawTicker - Raw ticker object from Binance WebSocket.
   * @returns Enriched ticker object or null if invalid.
   */
  static enrichTickerData(rawTicker: RawBinanceTicker): Ticker | null {
    if (!rawTicker || !rawTicker.s) {
      logger.warn(
        "MarketDataService: Encountered a raw ticker without a symbol.",
        rawTicker
      );
      return null;
    }

    const symbol = rawTicker.s;
    const lastPrice = parseFloat(rawTicker.c);

    const change_1h = PriceCalculationService.calculatePriceChange(
      symbol,
      lastPrice,
      CALCULATION_INTERVALS.change_1h
    );
    const change_4h = PriceCalculationService.calculatePriceChange(
      symbol,
      lastPrice,
      CALCULATION_INTERVALS.change_4h
    );
    const change_8h = PriceCalculationService.calculatePriceChange(
      symbol,
      lastPrice,
      CALCULATION_INTERVALS.change_8h
    );
    const change_12h = PriceCalculationService.calculatePriceChange(
      symbol,
      lastPrice,
      CALCULATION_INTERVALS.change_12h
    );

    const tickerEntry: Ticker = {
      symbol: symbol,
      lastPrice: rawTicker.c,
      priceChange: rawTicker.p,
      priceChangePercent: rawTicker.P,
      highPrice: rawTicker.h,
      lowPrice: rawTicker.l,
      volume: rawTicker.v,
      quoteVolume: rawTicker.q,
      openTime: rawTicker.O,
      closeTime: rawTicker.C,
      firstId: rawTicker.F,
      lastId: rawTicker.L,
      count: rawTicker.n,
      change_1h,
      change_4h,
      change_8h,
      change_12h,
      last_updated: new Date().toISOString(),
    };

    return tickerEntry;
  }
}

export default MarketDataService;
