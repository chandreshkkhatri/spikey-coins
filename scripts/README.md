# Spikey Coins Scripts

This directory contains scripts for generating and maintaining coin data files for the Spikey Coins project. These scripts replace the admin functionality that was previously embedded in the Node.js server.

## Purpose

The scripts in this directory are responsible for:

- Matching all Binance symbols (spot and futures) with CoinGecko data
- Generating comprehensive CSV files with market data, market cap, and crypto information
- Creating CoinGecko ID mappings for Binance symbols
- Updating market data from CoinGecko API

## Installation

1. Navigate to the scripts directory:
   ```bash
   cd scripts
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment configuration:
   ```bash
   cp .env.example .env
   ```

4. Edit `.env` and add your CoinGecko API key:
   ```env
   COINGECKO_API_KEY=your_coingecko_api_key_here
   ```

## Usage

### Available Commands

```bash
# Match all Binance symbols with CoinGecko and generate comprehensive CSV
npm run match-binance-coingecko

# Generate market data (alias for match-binance-coingecko)
npm run generate-market-data
npm run setup

# Update CoinGecko ID mappings
npm run update-coin-ids

# Update market data
npm run update-market-data

# Using the CLI directly
npx tsx index.ts match-binance-coingecko
npx tsx index.ts setup
npx tsx index.ts generate-market-data
```

### Initial Setup

For first-time setup or when adding new trading pairs:

```bash
npm run setup
```

This will:
1. Fetch all active trading pairs from Binance (spot and futures)
2. Fetch the complete list of coins from CoinGecko (18,000+ coins)
3. Match Binance symbols with CoinGecko data using smart algorithms
4. Generate comprehensive CSV with market data, rankings, and metrics

### Regular Updates

For regular market data updates (can be automated):

```bash
npm run match-binance-coingecko
```

## Generated Files

The main script generates the following files in `output/`:

- **`binance-coingecko-matches.csv`**: Comprehensive CSV with all matched symbols, market data, rankings, and metrics
- **`unmatched-symbols.json`**: List of Binance symbols that couldn't be matched with CoinGecko

The individual CoinGecko scripts generate these files in `../node-server/coin-data/`:

- **`coingecko-ids.json`**: Maps Binance trading symbols to CoinGecko coin IDs
- **`coinmarketcap.json`**: Current market data including prices, market caps, and metadata

## File Structure

```
scripts/
├── package.json                              # Dependencies and npm scripts
├── tsconfig.json                             # TypeScript configuration  
├── .env.example                              # Environment template
├── .env                                      # Your API keys (git-ignored)
├── index.ts                                  # Main CLI interface
├── binance-coingecko-matcher/
│   ├── binance-coingecko-matcher.ts          # Main matching script
│   ├── coingecko/
│   │   ├── CoinGeckoClient.ts                # CoinGecko API client
│   │   ├── updateMarketData.ts               # Market data update script
│   │   └── updateCoinIds.ts                  # Symbol mapping script
│   └── README.md                             # Matcher-specific documentation
├── output/                                   # Generated output files
│   ├── binance-coingecko-matches.csv         # Generated: matched symbols data
│   └── unmatched-symbols.json                # Generated: unmatched symbols
└── README.md                                 # This file
```

## API Rate Limiting

The scripts include built-in rate limiting to respect CoinGecko's API limits:

- Maximum 50 requests per minute
- 250ms delay between requests
- Automatic retry with backoff

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `COINGECKO_API_KEY` | Your CoinGecko API key | Required |
| `OUTPUT_DIR` | Output directory for data files | `../node-server/coin-data` |
| `REQUEST_TIMEOUT` | HTTP request timeout (ms) | `10000` |
| `DELAY_BETWEEN_REQUESTS` | Delay between API calls (ms) | `250` |

## Automation

You can automate these scripts using cron jobs or CI/CD pipelines:

### Cron Example (Update market data every 6 hours)

```bash
# Add to crontab  
0 */6 * * * cd /path/to/spikey-coins/scripts && npm run match-binance-coingecko
```

### GitHub Actions Example

```yaml
name: Update Market Data
on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd scripts && npm install
      - run: cd scripts && npm run match-binance-coingecko
        env:
          COINGECKO_API_KEY: ${{ secrets.COINGECKO_API_KEY }}
```

## Migration from Server

This replaces the following functionality that was previously in the Node.js server:

- `POST /api/admin/update-coingecko-data` → `npm run match-binance-coingecko` or `npm run update-market-data`
- CoinGecko client embedded in server → Standalone script with CoinGecko client  
- Admin routes and dependencies → Independent script execution
- Manual symbol mapping → Automated Binance-CoinGecko matching with smart algorithms

## Benefits of This Approach

1. **Separation of Concerns**: Data generation is separate from the real-time server
2. **Reduced Server Dependencies**: Server no longer needs CoinGecko API dependencies
3. **Better Resource Management**: Scripts can be run independently and scheduled
4. **Easier Automation**: Scripts can be easily integrated into CI/CD pipelines
5. **Improved Performance**: Server focuses only on real-time data processing

## Troubleshooting

### Common Issues

1. **API Key Error**: Make sure `COINGECKO_API_KEY` is set in your `.env` file
2. **Rate Limiting**: If you see rate limit errors, the script will automatically wait
3. **Network Issues**: Check your internet connection and CoinGecko API status
4. **File Permissions**: Ensure the script has write access to the output directory

### Debug Mode

Run scripts with debug output:

```bash
DEBUG=1 npm run match-binance-coingecko
```

## Contributing

When adding new trading pairs or improving matching:

1. The main script automatically fetches all active Binance symbols, so no manual additions needed
2. For special cases, add manual mappings to `specialMappings` in `updateCoinIds.ts` 
3. Run `npm run match-binance-coingecko` to generate updated comprehensive data
4. Review `unmatched-symbols.json` to identify symbols that need manual mapping
