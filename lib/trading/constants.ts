export const PAIRS = {
  "USDT-USDC": {
    base: "USDT",
    quote: "USDC",
    type: "spot" as const,
    makerFeeRate: "0.0001", // 0.01%
    takerFeeRate: "0.0003", // 0.03%
    tickSize: "0.0001",
    minQuantity: "0.01",
  },
  "XAU-PERP": {
    base: "XAU",
    quote: "USD",
    type: "futures" as const,
    contractSize: "0.001", // 0.001 troy oz per contract
    tickSize: "0.01",
    makerFeeRate: "0.0002", // 0.02%
    takerFeeRate: "0.0005", // 0.05%
    maxLeverage: 50,
    initialMarginRate: "0.02", // 2%
    maintenanceMarginRate: "0.01", // 1%
    minQuantity: "1",
  },
  "XAG-PERP": {
    base: "XAG",
    quote: "USD",
    type: "futures" as const,
    contractSize: "0.1", // 0.1 troy oz per contract
    tickSize: "0.001",
    makerFeeRate: "0.0002", // 0.02%
    takerFeeRate: "0.0005", // 0.05%
    maxLeverage: 50,
    initialMarginRate: "0.02",
    maintenanceMarginRate: "0.01",
    minQuantity: "1",
  },
} as const;

export type PairKey = keyof typeof PAIRS;
export type SpotPair = "USDT-USDC";
export type FuturesPair = "XAU-PERP" | "XAG-PERP";

export const FUNDING_INTERVAL_HOURS = 8;
export const FUNDING_RATE_CLAMP = 0.01; // +/- 1%

export const MARK_PRICE_INDEX_WEIGHT = 0.7;
export const MARK_PRICE_BOOK_WEIGHT = 0.3;

// Fallback prices if external API is down
export const FALLBACK_PRICES = {
  gold: 2850,
  silver: 32,
} as const;
