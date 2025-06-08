/**
 * Calculation utilities for ticker data processing
 */

interface TickerItem {
  h: string;
  l: string;
  c: string;
  v: string;
  P: string;
  p: string;
}

interface AdditionalMetrics {
  volume_usd: number | null;
  volume_base: number | null;
  range_position_24h: number | null;
  price: number | null;
  price_change_24h_percent: number;
  price_change_24h_value: number;
  high_24h: number;
  low_24h: number;
}

/**
 * Calculate percentage change between two prices
 */
export function calculatePercentageChange(
  oldPrice: number,
  newPrice: number
): number | null {
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
 * Calculate 24h range position percentage
 * Shows where current price sits within the day's high-low range
 */
export function calculate24hRangePosition(item: TickerItem): number | null {
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
 */
export function calculateAdditionalMetrics(
  item: TickerItem
): AdditionalMetrics {
  const metrics: AdditionalMetrics = {
    volume_usd: null,
    volume_base: null,
    range_position_24h: null,
    price: null,
    price_change_24h_percent: 0,
    price_change_24h_value: 0,
    high_24h: 0,
    low_24h: 0,
  };

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

  // Convert string numbers to actual numbers for better sorting/filtering
  metrics.price = !isNaN(price) ? price : null;
  metrics.price_change_24h_percent = parseFloat(item.P); // Binance provides this as 'P'
  metrics.price_change_24h_value = parseFloat(item.p); // Binance provides this as 'p'
  metrics.high_24h = parseFloat(item.h);
  metrics.low_24h = parseFloat(item.l);

  return metrics;
}
