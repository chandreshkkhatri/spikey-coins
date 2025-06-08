/**
 * Calculation utilities for ticker data processing
 */

/**
 * Calculate percentage change between two prices
 * @param {number} oldPrice - The old price
 * @param {number} newPrice - The new price
 * @returns {number} Percentage change, rounded to 2 decimal places
 */
function calculatePercentageChange(oldPrice, newPrice) {
  if (
    oldPrice === null ||
    oldPrice === undefined ||
    typeof oldPrice !== "number" ||
    newPrice === null ||
    newPrice === undefined ||
    typeof newPrice !== "number"
  ) {
    return null; // Or handle as an error, depending on requirements
  }
  if (oldPrice === 0) return newPrice === 0 ? 0 : null; // Avoid division by zero; if newPrice is also 0, change is 0.
  const change = ((newPrice - oldPrice) / oldPrice) * 100;
  return parseFloat(change.toFixed(2)); // Round to 2 decimal places
}

/**
 * Calculate normalized volume score for a ticker item
 * This shows how significant the volume is relative to market cap
 * @param {object} item - Ticker item with market_cap, v (volume), and c (price)
 * @returns {number | null} Normalized volume score, rounded to 2 decimal places, or null if data is missing
 */
function calculateNormalizedVolumeScore(item) {
  if (
    !item ||
    typeof item.market_cap !== "number" ||
    typeof item.v !== "string" ||
    typeof item.c !== "string"
  )
    return null;
  const volume = parseFloat(item.v);
  const price = parseFloat(item.c);
  if (isNaN(volume) || isNaN(price) || item.market_cap === 0) return null;

  const volumeUSD = volume * price;
  const score = (volumeUSD * 100000) / item.market_cap;
  return parseFloat((score / 100).toFixed(2));
}

/**
 * Calculate 24h range position percentage
 * Shows where current price sits within the day's high-low range
 * @param {object} item - Ticker item with h (high), l (low), and c (current price)
 * @returns {number | null} Position percentage (0-100), rounded to 2 decimal places, or null if data is missing
 */
function calculate24hRangePosition(item) {
  if (
    !item ||
    typeof item.h !== "string" ||
    typeof item.l !== "string" ||
    typeof item.c !== "string"
  )
    return null;
  const high = parseFloat(item.h);
  const low = parseFloat(item.l);
  const current = parseFloat(item.c);

  if (isNaN(high) || isNaN(low) || isNaN(current)) return null;
  if (high === low) return 50; // Avoid division by zero, price is stable

  const position = ((current - low) / (high - low)) * 100;
  return parseFloat(position.toFixed(2));
}

/**
 * Calculate additional metrics for ticker data
 * Moves all calculations from frontend to backend
 * @param {object} item - Ticker item from Binance (strings for numbers)
 * @param {object} marketCapDataItem - Corresponding market cap data from CoinGecko (numbers)
 * @returns {object} Additional calculated metrics, with numbers where appropriate
 */
function calculateAdditionalMetrics(item, marketCapDataItem) {
  const metrics = {};
  const price = parseFloat(item.c);
  const volume = parseFloat(item.v);

  // Volume calculations
  metrics.volume_usd =
    !isNaN(price) && !isNaN(volume)
      ? parseFloat((volume * price).toFixed(0))
      : null;
  metrics.volume_base = !isNaN(volume) ? volume : null;

  // Range position calculation
  metrics.range_position_24h = calculate24hRangePosition(item);

  // Normalized volume score (requires market_cap from marketCapDataItem)
  if (marketCapDataItem && typeof marketCapDataItem.market_cap === "number") {
    const tempItemForVolumeScore = {
      ...item,
      market_cap: marketCapDataItem.market_cap,
    };
    metrics.normalized_volume_score = calculateNormalizedVolumeScore(
      tempItemForVolumeScore
    );
  }

  // Convert string numbers to actual numbers for better sorting/filtering
  metrics.price = !isNaN(price) ? price : null;
  metrics.price_change_24h_percent = parseFloat(item.P); // Binance provides this as 'P'
  metrics.price_change_24h_value = parseFloat(item.p); // Binance provides this as 'p'
  metrics.high_24h = parseFloat(item.h);
  metrics.low_24h = parseFloat(item.l);

  // Add market cap data directly if available
  if (marketCapDataItem) {
    metrics.market_cap = marketCapDataItem.market_cap;
    metrics.circulating_supply = marketCapDataItem.circulating_supply;
    // Add other relevant fields from marketCapDataItem as needed
  }

  return metrics;
}

module.exports = {
  calculatePercentageChange,
  calculateNormalizedVolumeScore,
  calculate24hRangePosition,
  calculateAdditionalMetrics,
};
