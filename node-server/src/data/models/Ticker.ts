export interface Ticker {
  symbol: string;
  lastPrice: string;
  priceChange: string;
  priceChangePercent: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
  openTime: number;
  closeTime: number;
  firstId: number;
  lastId: number;
  count: number;
  name?: string;
  image?: string; // Added for CoinGecko image URLs
  imageUrl?: string;
  marketCap?: number;
  market_cap_rank?: number; // Added for CoinGecko market cap rank
  circulatingSupply?: number;
  ath?: number;
  ath_date?: string;
  atl?: number;
  atl_date?: string;
  change_1h?: number | null;
  change_4h?: number | null;
  change_8h?: number | null;
  change_12h?: number | null;
  last_updated?: string; // Added for timestamp
  
  // Additional calculated properties from calculations.ts
  s?: string; // Symbol (alternative property name used in tests)
  price?: number | null; // Numeric price
  price_change_24h_percent?: number; // 24h price change percentage
  price_change_24h_value?: number; // 24h price change value
  change_24h?: number; // Alternative name for 24h change
  high_24h?: number; // 24h high price
  low_24h?: number; // 24h low price
  volume_usd?: number | null; // Volume in USD
  volume_base?: number | null; // Base volume
  range_position_24h?: number | null; // Position within 24h range
  normalized_volume_score?: number; // Normalized volume score
}
