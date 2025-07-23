# Spikey Coins Scripts

This directory contains scripts for generating and maintaining coin data files for the Spikey Coins project. These scripts replace the admin functionality that was previously embedded in the Node.js server.

## Purpose

The scripts in this directory are responsible for:

- Fetching market data from CoinGecko API
- Creating and maintaining CoinGecko ID mappings for Binance symbols
- Generating static coin data files used by the main application

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
# Run initial setup (recommended for first time)
npm run setup

# Update CoinGecko ID mappings
npm run update-coingecko-ids

# Update market data
npm run update-coingecko-data

# Using the CLI directly
npx tsx index.ts setup
npx tsx index.ts update-coin-ids
npx tsx index.ts update-market-data
```

### Initial Setup

For first-time setup or when adding new trading pairs:

```bash
npm run setup
```

This will:
1. Fetch the complete list of coins from CoinGecko
2. Create mappings between Binance symbols and CoinGecko IDs
3. Fetch and save current market data

### Regular Updates

For regular market data updates (can be automated):

```bash
npm run update-coingecko-data
```

## Generated Files

The scripts generate the following files in `../node-server/coin-data/`:

- **`coingecko-ids.json`**: Maps Binance trading symbols to CoinGecko coin IDs
- **`coinmarketcap.json`**: Current market data including prices, market caps, and metadata

## File Structure

```
scripts/
├── package.json              # Dependencies and npm scripts
├── tsconfig.json             # TypeScript configuration
├── .env.example              # Environment template
├── .env                      # Your API keys (git-ignored)
├── index.ts                  # Main CLI interface
├── coingecko/
│   ├── CoinGeckoClient.ts    # CoinGecko API client
│   ├── updateMarketData.ts   # Market data update script
│   └── updateCoinIds.ts      # Symbol mapping script
└── README.md                 # This file
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
0 */6 * * * cd /path/to/spikey-coins/scripts && npm run update-coingecko-data
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
      - run: cd scripts && npm run update-coingecko-data
        env:
          COINGECKO_API_KEY: ${{ secrets.COINGECKO_API_KEY }}
```

## Migration from Server

This replaces the following functionality that was previously in the Node.js server:

- `POST /api/admin/update-coingecko-data` → `npm run update-coingecko-data`
- CoinGecko client embedded in server → Standalone script with CoinGecko client
- Admin routes and dependencies → Independent script execution

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
DEBUG=1 npm run update-coingecko-data
```

## Contributing

When adding new trading pairs:

1. Add the symbol (without USDT) to `MAJOR_SYMBOLS` in `updateCoinIds.ts`
2. Add any special ID mappings to the `specialMappings` object if needed
3. Run `npm run update-coingecko-ids` to regenerate the mappings
4. Run `npm run update-coingecko-data` to fetch market data
