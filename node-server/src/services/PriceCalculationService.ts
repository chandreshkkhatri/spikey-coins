/**
 * PriceCalculationService
 * Handles the calculation of short-term price changes for tickers.
 */
import CandlestickRepository from "../data/repositories/CandlestickRepository.js";
import { CalculationInterval } from "../config/constants.js";

class PriceCalculationService {
  /**
   * Calculates the percentage price change for a single symbol over a given period.
   *
   * @param symbol - The trading symbol (e.g., 'BTCUSDT').
   * @param currentPrice - The current price to compare against.
   * @param calculationConfig - The configuration for the calculation, specifying the interval and periods back.
   * @returns The percentage change, or null if calculation is not possible.
   */
  static calculatePriceChange(
    symbol: string,
    currentPrice: number,
    calculationConfig: CalculationInterval
  ): number | null {
    if (isNaN(currentPrice) || !calculationConfig) {
      return null;
    }

    const { interval, periodsBack } = calculationConfig;

    const previousPrice = CandlestickRepository.getPriceNIntervalsAgo(
      symbol,
      interval,
      periodsBack
    );

    if (previousPrice === null || previousPrice === 0) {
      return null;
    }

    const percentChange = ((currentPrice - previousPrice) / previousPrice) * 100;

    if (isNaN(percentChange)) {
      return null;
    }

    return parseFloat(percentChange.toFixed(2));
  }
}

export default PriceCalculationService;
