/**
 * Margin calculation utilities for futures trading.
 * All functions are pure — no DB access. Values are strings for DECIMAL precision.
 */

export function calculateNotional(
  quantity: string,
  contractSize: string,
  price: string
): number {
  return parseFloat(quantity) * parseFloat(contractSize) * parseFloat(price);
}

export function calculateInitialMargin(
  quantity: string,
  contractSize: string,
  price: string,
  leverage: number
): number {
  const notional = calculateNotional(quantity, contractSize, price);
  return notional / leverage;
}

export function calculateMaintenanceMargin(
  quantity: string,
  contractSize: string,
  markPrice: string,
  maintenanceMarginRate: string
): number {
  const notional = calculateNotional(quantity, contractSize, markPrice);
  return notional * parseFloat(maintenanceMarginRate);
}

export function calculateLiquidationPrice(
  entryPrice: string,
  side: "long" | "short",
  leverage: number,
  maintenanceMarginRate: string
): number {
  const entry = parseFloat(entryPrice);
  const mmr = parseFloat(maintenanceMarginRate);
  // Distance from entry before maintenance margin is breached
  const factor = 1 / leverage - mmr;

  if (side === "long") {
    // Long liquidated when price drops
    return entry * (1 - factor);
  } else {
    // Short liquidated when price rises
    return entry * (1 + factor);
  }
}

export function calculateUnrealizedPnl(
  side: "long" | "short",
  entryPrice: string,
  markPrice: string,
  quantity: string,
  contractSize: string
): number {
  const entry = parseFloat(entryPrice);
  const mark = parseFloat(markPrice);
  const qty = parseFloat(quantity);
  const cs = parseFloat(contractSize);

  if (side === "long") {
    return (mark - entry) * qty * cs;
  } else {
    return (entry - mark) * qty * cs;
  }
}

export function isLiquidatable(
  margin: string,
  unrealizedPnl: number,
  maintenanceMargin: number
): boolean {
  return parseFloat(margin) + unrealizedPnl < maintenanceMargin;
}
