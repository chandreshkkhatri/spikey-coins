/**
 * PriceCalculationService
 * Handles the calculation of short-term price changes for tickers.
 */
import CandlestickRepository from "../data/repositories/CandlestickRepository.js";
import {
  CALCULATION_INTERVALS,
  type CalculationInterval,
} from "../config/constants.js";
import { calculatePercentageChange } from "../utils/calculations.js";
import logger from "../utils/logger.js";

export interface ShortTermChanges {
  change_1h: number | null;
  change_4h: number | null;
  change_8h: number | null;
  change_12h: number | null;
}

class PriceCalculationService {
  /**
   * Calculates all defined short-term price changes for a given symbol and its current price.
   * @param symbol - The trading symbol (e.g., "BTCUSDT").
   * @param currentPrice - The current price of the symbol.
   * @returns An object containing the calculated changes (e.g., { change_1h: 0.5, change_4h: -1.2 }).
   *          Returns null for a specific change if data is insufficient.
   */
  static calculateAllShortTermChanges(
    symbol: string,
    currentPrice: number
  ): ShortTermChanges | null {
    if (!symbol || typeof currentPrice !== "number") {
      logger.warn(
        "PriceCalculationService.calculateAllShortTermChanges: Invalid parameters.",
        { symbol, currentPrice }
      );
      return null;
    }
    const normalizedSymbol = symbol.toLowerCase(); // Ensure consistency
    logger.debug(
      `PriceCalculationService: Calculating short-term changes for ${normalizedSymbol}, current price: ${currentPrice}`
    );

    const changes: Partial<ShortTermChanges> = {};

    try {
      for (const [changeKey, config] of Object.entries(
        CALCULATION_INTERVALS
      ) as [keyof ShortTermChanges, CalculationInterval][]) {
        const { interval: baseInterval, periodsBack } = config;
        logger.debug(
          `PriceCalculationService: Calculating ${changeKey} for ${normalizedSymbol} using ${baseInterval} interval, ${periodsBack} periods back.`
        );

        const historicalPrice = CandlestickRepository.getPriceNIntervalsAgo(
          normalizedSymbol,
          baseInterval,
          periodsBack
        );

        if (historicalPrice !== null) {
          changes[changeKey] = calculatePercentageChange(
            historicalPrice,
            currentPrice
          );
          logger.debug(
            `PriceCalculationService: ${changeKey} for ${normalizedSymbol} calculated: ${changes[changeKey]}% (Historical: ${historicalPrice}, Current: ${currentPrice})`
          );
        } else {
          changes[changeKey] = null;
          logger.debug(
            `PriceCalculationService: ${changeKey} for ${normalizedSymbol} could not be calculated - insufficient data or historical price was null.`
          );
        }
      }
      logger.debug(
        `PriceCalculationService: Short-term changes summary for ${normalizedSymbol}:`,
        changes
      );
    } catch (error) {
      logger.error(
        `PriceCalculationService: Error calculating short-term changes for ${normalizedSymbol}: ${
          (error as Error).message
        }`,
        error
      );
      // Ensure all change keys are present even if an error occurs mid-loop
      for (const changeKey of Object.keys(
        CALCULATION_INTERVALS
      ) as (keyof ShortTermChanges)[]) {
        if (!(changeKey in changes)) {
          changes[changeKey] = null;
        }
      }
    }
    return changes as ShortTermChanges;
  }
}

export default PriceCalculationService;
