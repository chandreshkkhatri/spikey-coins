/**
 * Calculation utilities for ticker data processing
 */

/**
 * Calculate percentage change between two prices
 * @param {number} oldPrice - The old price
 * @param {number} newPrice - The new price
 * @returns {number} Percentage change
 */
function calculatePercentageChange(oldPrice, newPrice) {
  if (!oldPrice || oldPrice === 0) return 0;
  return ((newPrice - oldPrice) / oldPrice) * 100;
}

/**
 * Calculate normalized volume score for a ticker item
 * This shows how significant the volume is relative to market cap
 * @param {Object} item - Ticker item with market_cap, v (volume), and c (price)
 * @returns {number} Normalized volume score
 */
function calculateNormalizedVolumeScore(item) {
  if (!item.market_cap || !item.v || !item.c) return 0;
  const volumeUSD = Number(item.v) * Number(item.c);
  const score = (volumeUSD * 100000) / Number(item.market_cap);
  return score / 100;
}

/**
 * Calculate 24h range position percentage
 * Shows where current price sits within the day's high-low range
 * @param {Object} item - Ticker item with h (high), l (low), and c (current price)
 * @returns {number} Position percentage (0-100)
 */
function calculate24hRangePosition(item) {
  const high = Number(item.h);
  const low = Number(item.l);
  const current = Number(item.c);

  if (high === low) return 50; // Avoid division by zero
  return ((current - low) / (high - low)) * 100;
}

/**
 * Calculate additional metrics for ticker data
 * Moves all calculations from frontend to backend
 * @param {Object} item - Ticker item
 * @returns {Object} Additional calculated metrics
 */
function calculateAdditionalMetrics(item) {
  const metrics = {};

  // Volume calculations
  metrics.volume_usd = Number(item.v) * Number(item.c);
  metrics.volume_base = Number(item.v);

  // Range position calculation
  metrics.range_position_24h = calculate24hRangePosition(item);

  // Normalized volume score
  metrics.normalized_volume_score = calculateNormalizedVolumeScore(item);

  // Convert string numbers to actual numbers for better sorting/filtering
  metrics.price = Number(item.c);
  metrics.change_24h = Number(item.P);
  metrics.high_24h = Number(item.h);
  metrics.low_24h = Number(item.l);

  return metrics;
}

module.exports = {
  calculatePercentageChange,
  calculateNormalizedVolumeScore,
  calculate24hRangePosition,
  calculateAdditionalMetrics,
};
