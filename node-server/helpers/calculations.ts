/**
 * Calculation utilities for ticker data processing
 */

// Define interface for ticker item
interface TickerItem {
  h: string; // high
  l: string; // low
  c: string; // current price
  v: string; // volume
  P: string; // price change percentage
  market_cap?: number;
}

interface AdditionalMetrics {
  volume_usd: number;
  volume_base: number;
  range_position_24h: number;
  normalized_volume_score: number;
  price: number;
  change_24h: number;
  high_24h: number;
  low_24h: number;
}

/**
 * Calculate percentage change between two prices
 * @param oldPrice - The old price
 * @param newPrice - The new price
 * @returns Percentage change
 */
function calculatePercentageChange(oldPrice: number, newPrice: number): number {
  if (!oldPrice || oldPrice === 0) return 0;
  return ((newPrice - oldPrice) / oldPrice) * 100;
}

/**
 * Calculate normalized volume score for a ticker item
 * This shows how significant the volume is relative to market cap
 * @param item - Ticker item with market_cap, v (volume), and c (price)
 * @returns Normalized volume score
 */
function calculateNormalizedVolumeScore(item: TickerItem): number {
  if (!item.market_cap || !item.v || !item.c) return 0;
  const volumeUSD = Number(item.v) * Number(item.c);
  const score = (volumeUSD * 100000) / Number(item.market_cap);
  return score / 100;
}

/**
 * Calculate 24h range position percentage
 * Shows where current price sits within the day's high-low range
 * @param item - Ticker item with h (high), l (low), and c (current price)
 * @returns Position percentage (0-100)
 */
function calculate24hRangePosition(item: TickerItem): number {
  const high = Number(item.h);
  const low = Number(item.l);
  const current = Number(item.c);

  if (high === low) return 50; // Avoid division by zero
  return ((current - low) / (high - low)) * 100;
}

/**
 * Calculate additional metrics for ticker data
 * Moves all calculations from frontend to backend
 * @param item - Ticker item
 * @returns Additional calculated metrics
 */
function calculateAdditionalMetrics(item: TickerItem): AdditionalMetrics {
  const metrics: AdditionalMetrics = {
    // Volume calculations
    volume_usd: Number(item.v) * Number(item.c),
    volume_base: Number(item.v),

    // Range position calculation
    range_position_24h: calculate24hRangePosition(item),

    // Normalized volume score
    normalized_volume_score: calculateNormalizedVolumeScore(item),

    // Convert string numbers to actual numbers for better sorting/filtering
    price: Number(item.c),
    change_24h: Number(item.P),
    high_24h: Number(item.h),
    low_24h: Number(item.l),
  };

  return metrics;
}

export {
  calculatePercentageChange,
  calculateNormalizedVolumeScore,
  calculate24hRangePosition,
  calculateAdditionalMetrics,
  type TickerItem,
  type AdditionalMetrics,
};
