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
}
