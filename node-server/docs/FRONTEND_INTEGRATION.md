# Frontend Integration Guide

This guide shows how to integrate with the Spikey Coins Proxy Server API from your frontend application.

## 🚀 Quick Start

The API is designed to be easily consumed by any frontend framework. All endpoints return JSON data and support CORS.

### Base Configuration

```javascript
// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

// API Client Setup
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});
```

## 📊 Integration Examples

### 1. Real-time Ticker Data

```javascript
// Fetch all ticker data with short-term changes
const fetchTickerData = async () => {
  try {
    const response = await apiClient.get("/api/ticker/24hr");

    if (response.data.success) {
      const tickers = response.data.data;

      // Process ticker data
      const processedData = tickers.map((ticker) => ({
        symbol: ticker.s,
        price: parseFloat(ticker.c),
        change24h: parseFloat(ticker.P),
        change1h: ticker.change_1h,
        change4h: ticker.change_4h,
        change8h: ticker.change_8h,
        change12h: ticker.change_12h,
        volume: parseFloat(ticker.v),
        marketCap: ticker.market_cap,
        // ... other fields
      }));

      return processedData;
    }
  } catch (error) {
    console.error("Error fetching ticker data:", error);
    throw error;
  }
};

// Usage in React component
const TickerComponent = () => {
  const [tickers, setTickers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTickers = async () => {
      try {
        const data = await fetchTickerData();
        setTickers(data);
      } catch (error) {
        // Handle error
      } finally {
        setLoading(false);
      }
    };

    loadTickers();

    // Refresh every 5 seconds
    const interval = setInterval(loadTickers, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {tickers.map((ticker) => (
        <div key={ticker.symbol}>
          {ticker.symbol}: ${ticker.price}
          <span className={ticker.change24h > 0 ? "positive" : "negative"}>
            {ticker.change24h}%
          </span>
        </div>
      ))}
    </div>
  );
};
```

### 2. Candlestick Chart Data

```javascript
// Fetch candlestick data for charts
const fetchCandlestickData = async (symbol) => {
  try {
    const response = await apiClient.get(`/api/ticker/candlestick/${symbol}`);

    if (response.data.success) {
      const candles = response.data.data;

      // Format for charting libraries (e.g., Chart.js, TradingView)
      const chartData = candles.map((candle) => ({
        time: candle.openTime,
        open: parseFloat(candle.open),
        high: parseFloat(candle.high),
        low: parseFloat(candle.low),
        close: parseFloat(candle.close),
        volume: parseFloat(candle.volume),
      }));

      return chartData;
    }
  } catch (error) {
    console.error(`Error fetching candlestick data for ${symbol}:`, error);
    throw error;
  }
};

// Usage with Chart.js
const CandlestickChart = ({ symbol }) => {
  const [chartData, setChartData] = useState(null);

  useEffect(() => {
    const loadChartData = async () => {
      try {
        const data = await fetchCandlestickData(symbol);

        // Transform for Chart.js candlestick plugin
        const chartConfig = {
          data: {
            datasets: [
              {
                label: symbol,
                data: data.map((candle) => ({
                  x: candle.time,
                  o: candle.open,
                  h: candle.high,
                  l: candle.low,
                  c: candle.close,
                })),
              },
            ],
          },
          options: {
            responsive: true,
            scales: {
              x: { type: "time" },
              y: { beginAtZero: false },
            },
          },
        };

        setChartData(chartConfig);
      } catch (error) {
        // Handle error
      }
    };

    if (symbol) {
      loadChartData();
    }
  }, [symbol]);

  return chartData ? (
    <CandlestickChartComponent data={chartData} />
  ) : (
    <div>Loading chart...</div>
  );
};
```

### 3. Market Cap Data

```javascript
// Fetch market cap data
const fetchMarketCapData = async () => {
  try {
    const response = await apiClient.get("/api/ticker/marketCap");

    if (response.data.success) {
      const marketData = response.data.data;

      // Process market cap data
      const processedData = marketData.map((coin) => ({
        id: coin.id,
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
        price: coin.current_price,
        marketCap: coin.market_cap,
        marketCapRank: coin.market_cap_rank,
        volume24h: coin.total_volume,
        priceChange24h: coin.price_change_percentage_24h,
        image: coin.image,
        // ... other fields
      }));

      return processedData;
    }
  } catch (error) {
    console.error("Error fetching market cap data:", error);
    throw error;
  }
};
```

### 4. Health Monitoring

```javascript
// Monitor API health
const checkAPIHealth = async () => {
  try {
    const response = await apiClient.get("/api/ticker");

    if (response.data.status === "healthy") {
      return {
        isHealthy: true,
        tickerCount: response.data.tickerDataCount,
        candlestickSymbols: response.data.candlestickSymbols,
        rateLimiting: response.data.rateLimiting,
      };
    }
  } catch (error) {
    return { isHealthy: false, error: error.message };
  }
};

// Usage in app
const AppHealthMonitor = () => {
  const [apiHealth, setApiHealth] = useState(null);

  useEffect(() => {
    const checkHealth = async () => {
      const health = await checkAPIHealth();
      setApiHealth(health);
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="api-status">
      Status: {apiHealth?.isHealthy ? "🟢 Online" : "🔴 Offline"}
      {apiHealth?.tickerCount && <span>({apiHealth.tickerCount} tickers)</span>}
    </div>
  );
};
```

## 🔄 Real-time Updates

### Polling Strategy

```javascript
// Smart polling with exponential backoff
class APIPoller {
  constructor(apiClient) {
    this.apiClient = apiClient;
    this.intervals = new Map();
    this.retryDelays = new Map();
  }

  startPolling(endpoint, callback, intervalMs = 5000) {
    const poll = async () => {
      try {
        const response = await this.apiClient.get(endpoint);

        if (response.data.success) {
          callback(response.data);
          this.retryDelays.delete(endpoint); // Reset retry delay on success
        }
      } catch (error) {
        console.error(`Polling error for ${endpoint}:`, error);

        // Exponential backoff
        const currentDelay = this.retryDelays.get(endpoint) || intervalMs;
        const newDelay = Math.min(currentDelay * 2, 60000); // Max 1 minute
        this.retryDelays.set(endpoint, newDelay);

        // Retry with backoff
        setTimeout(poll, newDelay);
        return;
      }

      // Schedule next poll
      this.intervals.set(endpoint, setTimeout(poll, intervalMs));
    };

    poll(); // Start immediately
  }

  stopPolling(endpoint) {
    const intervalId = this.intervals.get(endpoint);
    if (intervalId) {
      clearTimeout(intervalId);
      this.intervals.delete(endpoint);
      this.retryDelays.delete(endpoint);
    }
  }

  stopAll() {
    this.intervals.forEach((intervalId) => clearTimeout(intervalId));
    this.intervals.clear();
    this.retryDelays.clear();
  }
}

// Usage
const poller = new APIPoller(apiClient);

// Start polling ticker data
poller.startPolling(
  "/api/ticker/24hr",
  (data) => {
    setTickers(data.data);
  },
  5000
);

// Cleanup on component unmount
useEffect(() => {
  return () => poller.stopAll();
}, []);
```

## 🎨 UI Components

### Price Change Indicator

```javascript
const PriceChangeIndicator = ({ change, period = '24h' }) => {
  const isPositive = change > 0;
  const className = `price-change ${isPositive ? 'positive' : 'negative'}`;

  return (
    <span className={className}>
      {isPositive ? '↗' : '↘'} {Math.abs(change).toFixed(2)}% ({period})
    </span>
  );
};

// CSS
.price-change {
  font-weight: bold;
  padding: 2px 6px;
  border-radius: 4px;
}

.price-change.positive {
  color: #10b981;
  background-color: rgba(16, 185, 129, 0.1);
}

.price-change.negative {
  color: #ef4444;
  background-color: rgba(239, 68, 68, 0.1);
}
```

### Ticker Table Component

```javascript
const TickerTable = ({ tickers, onSymbolClick }) => {
  const [sortConfig, setSortConfig] = useState({
    key: "marketCap",
    direction: "desc",
  });

  const sortedTickers = useMemo(() => {
    const sorted = [...tickers].sort((a, b) => {
      const aValue = a[sortConfig.key] || 0;
      const bValue = b[sortConfig.key] || 0;

      if (sortConfig.direction === "desc") {
        return bValue - aValue;
      }
      return aValue - bValue;
    });

    return sorted;
  }, [tickers, sortConfig]);

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "desc" ? "asc" : "desc",
    }));
  };

  return (
    <table className="ticker-table">
      <thead>
        <tr>
          <th onClick={() => handleSort("symbol")}>Symbol</th>
          <th onClick={() => handleSort("price")}>Price</th>
          <th onClick={() => handleSort("change24h")}>24h Change</th>
          <th onClick={() => handleSort("change1h")}>1h Change</th>
          <th onClick={() => handleSort("volume")}>Volume</th>
          <th onClick={() => handleSort("marketCap")}>Market Cap</th>
        </tr>
      </thead>
      <tbody>
        {sortedTickers.map((ticker) => (
          <tr
            key={ticker.symbol}
            onClick={() => onSymbolClick?.(ticker.symbol)}
          >
            <td className="symbol">{ticker.symbol}</td>
            <td className="price">${ticker.price.toLocaleString()}</td>
            <td>
              <PriceChangeIndicator change={ticker.change24h} />
            </td>
            <td>
              <PriceChangeIndicator change={ticker.change1h} period="1h" />
            </td>
            <td>{ticker.volume.toLocaleString()}</td>
            <td>
              {ticker.marketCap
                ? `$${ticker.marketCap.toLocaleString()}`
                : "N/A"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
```

## 🔧 Error Handling

```javascript
// Centralized error handling
const handleAPIError = (error, context = "") => {
  console.error(`API Error${context ? ` (${context})` : ""}:`, error);

  if (error.response) {
    // Server responded with error status
    const { status, data } = error.response;

    switch (status) {
      case 404:
        return "Data not found";
      case 429:
        return "Too many requests. Please try again later.";
      case 500:
        return "Server error. Please try again.";
      default:
        return data?.error || "An unexpected error occurred";
    }
  } else if (error.request) {
    // Network error
    return "Network error. Please check your connection.";
  } else {
    // Other error
    return error.message || "An unexpected error occurred";
  }
};

// Usage with React Error Boundary
const APIErrorBoundary = ({ children }) => {
  const [error, setError] = useState(null);

  const resetError = () => setError(null);

  useEffect(() => {
    const handleError = (error) => {
      const message = handleAPIError(error, "Global handler");
      setError(message);
    };

    // Add global error listener
    window.addEventListener("unhandledrejection", handleError);

    return () => {
      window.removeEventListener("unhandledrejection", handleError);
    };
  }, []);

  if (error) {
    return (
      <div className="error-boundary">
        <h3>Something went wrong</h3>
        <p>{error}</p>
        <button onClick={resetError}>Try Again</button>
      </div>
    );
  }

  return children;
};
```

## 📱 Mobile Considerations

```javascript
// Responsive ticker component
const MobileTickerCard = ({ ticker }) => {
  return (
    <div className="mobile-ticker-card">
      <div className="ticker-header">
        <span className="symbol">{ticker.symbol}</span>
        <span className="price">${ticker.price}</span>
      </div>
      <div className="ticker-changes">
        <PriceChangeIndicator change={ticker.change1h} period="1h" />
        <PriceChangeIndicator change={ticker.change24h} period="24h" />
      </div>
      {ticker.marketCap && (
        <div className="market-cap">
          Market Cap: ${ticker.marketCap.toLocaleString()}
        </div>
      )}
    </div>
  );
};

// Responsive CSS
@media (max-width: 768px) {
  .ticker-table {
    display: none;
  }

  .mobile-ticker-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1rem;
  }

  .mobile-ticker-card {
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 1rem;
    background: white;
  }
}
```

This integration guide provides everything your frontend team needs to seamlessly integrate with your Spikey Coins API!
