# Spikey Coins

A comprehensive cryptocurrency tracking application with real-time price monitoring, volume analysis, and market cap integration. The project consists of a Node.js proxy server and a React-based user interface.

## 🚀 Features

- **Real-time Data:** Live ticker data from Binance WebSocket streams
- **Market Analysis:** Integration with CoinGecko for market cap data
- **Volume Tracking:** Advanced volume analysis with normalized scoring
- **Modern UI:** Responsive React interface with advanced filtering
- **CORS Handling:** Proxy server to bypass API restrictions
- **Error Resilience:** Comprehensive error handling and logging

## 📁 Project Structure

```
spikey-coins/
├── node-server/          # Backend proxy server
│   ├── app.js           # Main server file
│   ├── routers/         # API route handlers
│   └── coin-data/       # Static coin data files
└── react-ui/            # Frontend React application
    ├── src/
    │   ├── components/  # React components
    │   └── utils/       # API client and utilities
    └── public/          # Static assets
```

## 🛠️ Quick Start

### Prerequisites

- Node.js 14+
- npm or yarn
- CoinGecko API key (optional, for market cap data)

### 1. Setup Backend Server

```bash
cd node-server
npm install
cp .env.example .env
# Edit .env with your CoinGecko API key
npm run dev
```

The server will start on `http://localhost:8000`

### 2. Setup Frontend Application

```bash
cd react-ui
npm install
npm start
```

The React app will start on `http://localhost:3000`

## 🔧 Configuration

### Backend Environment Variables

Create `node-server/.env`:

```env
COINGECKO_API_KEY=your_api_key_here
PORT=8000
```

### Frontend Configuration

The React app automatically connects to the backend at `http://localhost:8000`. To change this, edit `react-ui/src/utils/config.json`.

## 📊 API Endpoints

### Ticker Data

- `GET /api/ticker/24hr` - Get 24-hour ticker data
- `GET /api/ticker/marketCap` - Get market cap data from CoinGecko
- `GET /api/ticker/refreshMarketcapData` - Refresh market cap data

### Health Checks

- `GET /` - Server health status
- `GET /api/ticker/` - Ticker router status

## 🎯 Usage

1. **Start both servers** (backend on :8000, frontend on :3000)
2. **Access the UI** at `http://localhost:3000`
3. **View real-time data** for USDT trading pairs
4. **Use filters** to search for specific cryptocurrencies
5. **Sort by volume** to find high-activity pairs
6. **Monitor normalized volume scores** for trend analysis

## 📈 Key Metrics

- **Price:** Current trading price in USD
- **24h Change:** Percentage change with color indicators
- **Volume:** 24-hour trading volume in USD
- **Market Cap:** Market capitalization from CoinGecko
- **Normalized Volume Score:** Custom metric: `(Volume × 100,000) / Market Cap`

## 🔄 Data Sources

- **Binance WebSocket** - Real-time ticker data
- **CoinGecko API** - Market capitalization data
- **Local JSON files** - Coin mappings and static data

## 🚧 Development

### Backend Development

```bash
cd node-server
npm run dev  # Uses nodemon for auto-restart
```

### Frontend Development

```bash
cd react-ui
npm start    # Hot-reload development server
```

### Production Build

```bash
# Backend
cd node-server
npm start

# Frontend
cd react-ui
npm run build
npm run serve
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- Binance for providing WebSocket API access
- CoinGecko for market data API
- React Table for the advanced table component
- The cryptocurrency community for inspiration

---

**Note:** This application is for educational and informational purposes only. Always do your own research before making investment decisions.
