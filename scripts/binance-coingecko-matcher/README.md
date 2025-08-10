# Binance-CoinGecko Matcher

This tool fetches all symbols from Binance (spot and futures markets) and matches them with CoinGecko data to create a comprehensive CSV file with market cap and other cryptocurrency information.

## Features

- Fetches all active trading pairs from Binance Spot and Futures markets
- Matches symbols with CoinGecko's database of 18,000+ cryptocurrencies
- Smart matching algorithm using:
  - Symbol matching (primary method)
  - Price-based disambiguation when multiple coins share the same symbol
  - Name similarity matching (Levenshtein distance) as fallback
- Generates comprehensive CSV with:
  - Market cap and ranking
  - 24h volume
  - Circulating, total, and max supply
  - All-time high/low with dates
  - Price changes
  - Match confidence scores

## Setup

1. Install dependencies:
```bash
npm install dotenv axios csv-stringify
```

2. Set up your CoinGecko API key in `.env`:
```bash
COINGECKO_API_KEY=your_api_key_here
```

## Usage

Run the script:
```bash
npx tsx binance-coingecko-matcher.ts
```

## Output Files

Generated in `../output/`:

- `binance-coingecko-matches.csv` - Main output with all matched symbols and their data
- `unmatched-symbols.json` - List of Binance symbols that couldn't be matched

## How It Works

1. **Data Collection**:
   - Fetches all trading symbols from Binance Spot API (`/api/v3/exchangeInfo`)
   - Fetches all trading symbols from Binance Futures API (`/fapi/v1/exchangeInfo`)
   - Gets current prices for all symbols
   - Fetches complete coins list from CoinGecko (18,000+ coins)

2. **Matching Process**:
   - Identifies unique base assets from Binance (excluding stablecoins)
   - Finds potential CoinGecko matches based on symbol and name similarity
   - Fetches detailed market data for potential matches (in batches to respect API limits)
   - Applies matching algorithm to find best match for each Binance symbol

3. **Matching Algorithm**:
   - **Exact Symbol Match**: Direct symbol comparison (highest priority)
   - **Price Comparison**: When multiple CoinGecko entries have the same symbol, compares current prices to find the closest match
   - **Name Similarity**: Uses Levenshtein distance to match by name when no symbol match exists
   - **Scoring**: Calculates confidence scores for both price and name matching

## API Rate Limiting

The script implements rate limiting to respect API limits:
- CoinGecko: 1.2 second delay between batch requests
- Processes market data in batches of 250 coins (CoinGecko's limit per request)

## Files Structure

```
binance-coingecko-matcher/
├── binance-coingecko-matcher.ts  # Main script
├── coingecko/
│   ├── CoinGeckoClient.ts        # CoinGecko API client
│   ├── updateCoinIds.ts          # Helper script for updating coin IDs
│   └── updateMarketData.ts       # Helper script for market data updates
└── README.md                      # This file

../output/                         # Generated output files
├── binance-coingecko-matches.csv # Output: Matched symbols with data
└── unmatched-symbols.json        # Output: Symbols that couldn't be matched
```