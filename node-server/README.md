# Spikey Coins Proxy Server

A Node.js proxy server that provides cryptocurrency ticker data by connecting to Binance WebSocket streams and CoinGecko API.

This is a companion project to the [Spikey Coins React UI](https://github.com/gerdent/coin-spikey-react-ui).

## Features

- Real-time ticker data from Binance WebSocket
- Market cap data from CoinGecko API
- CORS-enabled endpoints for web applications
- Error handling and logging
- Environment-based configuration

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy environment variables:

   ```bash
   cp .env.example .env
   ```

3. Configure your `.env` file:

   - Add your CoinGecko API key
   - Set custom port if needed (default: 8000)

4. Start the server:

   ```bash
   # Development (with nodemon)
   npm run dev

   # Production
   npm start
   ```

## API Endpoints

### Health Check

- **GET** `/` - Server health status

### Ticker Data

- **GET** `/api/ticker/` - Ticker router health check
- **GET** `/api/ticker/24hr` - Get 24-hour ticker data from Binance
- **GET** `/api/ticker/marketCap` - Get market cap data from CoinGecko
- **GET** `/api/ticker/refreshMarketcapData` - Refresh market cap data (placeholder)

## Environment Variables

| Variable            | Description                 | Required |
| ------------------- | --------------------------- | -------- |
| `COINGECKO_API_KEY` | Your CoinGecko API key      | Yes      |
| `PORT`              | Server port (default: 8000) | No       |

## Dependencies

- **express** - Web framework
- **axios** - HTTP client for API requests
- **cors** - Cross-origin resource sharing
- **@binance/connector** - Binance WebSocket client
- **dotenv** - Environment variable management
- **ws** - WebSocket implementation

## Data Sources

- **Binance WebSocket** - Real-time ticker data
- **CoinGecko API** - Market cap and additional coin data
- **Local JSON files** - Coin mappings and market cap data

## Error Handling

The server includes comprehensive error handling for:

- WebSocket connection issues
- API request failures
- Missing environment variables
- Invalid data parsing
