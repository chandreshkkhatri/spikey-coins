# Spikey Coins React UI

A modern React application for tracking cryptocurrency prices, volumes, and market trends with real-time data from Binance.

## Features

- 📊 Real-time ticker data for USDT trading pairs
- 💹 Market cap integration from CoinGecko
- 🔍 Advanced filtering and search capabilities
- 📱 Responsive design with modern UI
- ⚡ Live price change indicators with color coding
- 📈 Normalized volume scoring for trend analysis
- 🔄 Auto-refresh capabilities

## Setup

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Environment configuration:**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` file if you need to change the API endpoint.

3. **Start development server:**

   ```bash
   npm start
   ```

4. **Build for production:**
   ```bash
   npm run build
   ```

## Prerequisites

This React UI works with the [Spikey Coins Proxy Server](../node-server/README.md). Make sure the proxy server is running on `http://localhost:8000` before starting the React app.

## Available Scripts

- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run serve` - Build and serve production build locally

## Project Structure

```
src/
├── components/          # React components
│   ├── AppRoutes.js    # Route configuration
│   └── Ticker.js       # Main ticker table component
├── utils/              # Utilities and API
│   ├── api.js         # API client configuration
│   └── config.json    # App configuration
├── App.js             # Main app component
└── index.js           # App entry point
```

## Features Overview

### Ticker Table

- **Symbol:** Trading pair with USDT
- **Price:** Current price in USD with appropriate decimal places
- **24h Change:** Percentage change with color indicators
- **Volume:** 24-hour trading volume in USD
- **Market Cap:** Market capitalization from CoinGecko
- **Normalized Volume Score:** Custom metric for trend analysis

### Advanced Features

- Sortable columns (default: sorted by volume)
- Real-time filtering and search
- Pagination with configurable page sizes
- Error handling and loading states
- Responsive design for mobile and desktop

## Technology Stack

- **React 16.14** - UI framework
- **React Router** - Client-side routing
- **React Table** - Advanced table component
- **Axios** - HTTP client for API requests
- **Materialize CSS** - UI components and styling

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for bugs and feature requests.

## License

This project is part of the Spikey Coins cryptocurrency tracking suite.
