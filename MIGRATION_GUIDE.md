# Migration Guide: CoinGecko Functionality to Scripts

This guide documents the migration of CoinGecko-related functionality from the Node.js server to standalone scripts.

## What Was Moved

### From Node.js Server
The following components were **removed** from the Node.js server:

1. **Files Removed:**
   - `src/external/CoinGeckoClient.ts`
   - `src/api/routes/adminRoutes.ts`

2. **Dependencies Removed:**
   - CoinGecko API integration from server
   - Admin routes (`POST /api/admin/update-coingecko-data`)

3. **Configuration Removed:**
   - `COINGECKO_BASE_URL` from constants
   - `COINGECKO_API_KEY` from server environment

4. **Imports Removed:**
   - `import adminRoutes` from `app.ts`
   - `app.use("/api/admin", adminRoutes)` route registration

### To Scripts Directory
The following components were **created** in `/scripts/`:

1. **New Files:**
   - `scripts/package.json` - Dependencies and npm scripts
   - `scripts/tsconfig.json` - TypeScript configuration
   - `scripts/.env.example` - Environment template
   - `scripts/coingecko/CoinGeckoClient.ts` - Enhanced CoinGecko client
   - `scripts/coingecko/updateMarketData.ts` - Market data update script
   - `scripts/coingecko/updateCoinIds.ts` - Symbol mapping script
   - `scripts/index.ts` - CLI interface
   - `scripts/README.md` - Documentation

## Migration Benefits

1. **Separation of Concerns**: Data generation is now separate from real-time server operations
2. **Reduced Server Dependencies**: Server no longer needs CoinGecko API dependencies
3. **Better Resource Management**: Scripts can be run independently and scheduled
4. **Improved Performance**: Server focuses only on real-time Binance data processing
5. **Easier Automation**: Scripts can be integrated into CI/CD pipelines

## Before and After

### Before (Server-based)
```bash
# Update market data
curl -X POST http://localhost:8000/api/admin/update-coingecko-data

# Server needed:
# - CoinGecko API key in server environment
# - Admin routes running alongside real-time server
# - CoinGecko dependencies in server package.json
```

### After (Script-based)
```bash
# Setup scripts (one-time)
cd scripts
npm install
cp .env.example .env
# Edit .env with your CoinGecko API key

# Update market data
npm run update-coingecko-data

# Or run specific scripts
npm run update-coingecko-ids    # Update symbol mappings
npm run setup                   # Full setup (IDs + market data)
```

## Server Changes Summary

### Removed Components
- ❌ `POST /api/admin/update-coingecko-data` endpoint
- ❌ CoinGecko API client in server
- ❌ Admin routes infrastructure
- ❌ CoinGecko-related environment variables in server

### Server Now Focuses On
- ✅ Real-time Binance WebSocket streams
- ✅ Ticker data processing and enrichment
- ✅ Candlestick data management
- ✅ API endpoints for frontend consumption
- ✅ Rate limiting and error handling

## Data Flow Changes

### Before
```
Frontend → Server → {
  - Real-time Binance data ✓
  - CoinGecko API calls (admin) ✓
  - File management ✓
}
```

### After
```
Frontend → Server → Real-time Binance data ✓

Scheduled Scripts → {
  - CoinGecko API calls ✓
  - File generation ✓
  - Data preparation ✓
}
```

## Environment Variables

### Server (.env) - Simplified
```bash
# Server only needs
PORT=8000
```

### Scripts (.env) - New
```bash
# Scripts need
COINGECKO_API_KEY=your_coingecko_api_key_here
OUTPUT_DIR=../node-server/coin-data
REQUEST_TIMEOUT=10000
DELAY_BETWEEN_REQUESTS=250
```

## Automation Examples

### Cron Job (Linux/macOS)
```bash
# Update market data every 6 hours
0 */6 * * * cd /path/to/spikey-coins/scripts && npm run update-coingecko-data
```

### GitHub Actions
```yaml
name: Update Market Data
on:
  schedule:
    - cron: '0 */6 * * *'
jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: cd scripts && npm install
      - run: cd scripts && npm run update-coingecko-data
        env:
          COINGECKO_API_KEY: ${{ secrets.COINGECKO_API_KEY }}
```

### Docker (Optional)
```dockerfile
# scripts/Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["npm", "run", "update-coingecko-data"]
```

## API Changes

### Removed Endpoints
- `POST /api/admin/update-coingecko-data` - No longer available

### Existing Endpoints (Unchanged)
- `GET /api/ticker/24hr` - Still works, reads from generated files
- `GET /api/ticker/marketCap` - Still works, reads from generated files
- All other ticker endpoints remain functional

## File Output

Scripts generate the same files as before:
- `node-server/coin-data/coingecko-ids.json` - Symbol to CoinGecko ID mappings
- `node-server/coin-data/coinmarketcap.json` - Market data from CoinGecko

## Development Workflow

### For Server Development
```bash
cd node-server
npm run dev  # Focus on real-time features
```

### For Data Updates
```bash
cd scripts
npm run setup              # Initial setup
npm run update-coingecko-data  # Regular updates
```

### For Production Deployment
```bash
# Deploy server
cd node-server
npm run build
npm start

# Setup automated scripts (separate process/container)
cd scripts
npm install
# Setup cron job or scheduled task
```

## Troubleshooting

### Common Issues After Migration

1. **"Admin endpoint not found"**
   - Solution: Use `cd scripts && npm run update-coingecko-data`

2. **"CoinGecko API key not configured" in server logs**
   - Solution: This is normal, server no longer needs CoinGecko API key

3. **Empty market data**
   - Solution: Run `cd scripts && npm run setup` to generate initial data

4. **Outdated coin mappings**
   - Solution: Run `cd scripts && npm run update-coingecko-ids`

## Next Steps

1. **Install Script Dependencies**
   ```bash
   cd scripts
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your CoinGecko API key
   ```

3. **Run Initial Setup**
   ```bash
   npm run setup
   ```

4. **Setup Automation** (choose one)
   - Cron job for regular updates
   - CI/CD pipeline integration
   - Manual execution as needed

This migration improves the overall architecture by separating data generation concerns from real-time server operations, making the system more maintainable and scalable.
