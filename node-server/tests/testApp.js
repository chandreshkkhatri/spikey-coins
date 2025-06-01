/**
 * Test configuration for the Express app without WebSocket connections
 * This allows us to test HTTP endpoints without starting live data streams
 */

const express = require("express");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const path = require("path");

// Create Express app
const app = express();

// Enable strict routing so /candlestick and /candlestick/ are different
app.set('strict routing', true);

// Middleware
app.use(cors());
app.use(express.json());

// Mock ticker data for testing
const mockTickerData = [
  {
    e: "24hrTicker",
    E: 1748627644502,
    s: "BTCUSDT",
    p: "1000.00",
    P: "1.500",
    w: "67500.00",
    x: "66500.00",
    c: "67500.00",
    Q: "0.50000000",
    b: "67499.00",
    B: "2.50000000",
    a: "67500.00",
    A: "1.20000000",
    o: "66500.00",
    h: "68000.00",
    l: "66000.00",
    v: "12345.68000000",
    q: "833333340.00000000",
    O: 1748541244435,
    C: 1748627644435,
    F: 3456789,
    L: 3456790,
    n: 95482,
    // Backend calculated fields
    change_1h: 0.5,
    change_4h: 1.2,
    change_8h: -0.8,
    change_12h: 2.1,
    volume_usd: 833333400.0, // volume_base * price = 12345.68 * 67500.00
    volume_base: 12345.68,
    range_position_24h: 75.0,
    normalized_volume_score: 0.6750000600750043, // (volume_usd * 100000) / market_cap / 100
    price: 67500.0,
    change_24h: 1.5,
    high_24h: 68000.0,
    low_24h: 66000.0,
    market_cap: 1234567890123.45,
  },
  {
    e: "24hrTicker",
    E: 1748627644502,
    s: "ETHUSDT",
    p: "50.00",
    P: "2.000",
    w: "2550.00",
    x: "2500.00",
    c: "2550.00",
    Q: "1.00000000",
    b: "2549.00",
    B: "5.00000000",
    a: "2550.00",
    A: "2.00000000",
    o: "2500.00",
    h: "2600.00",
    l: "2450.00",
    v: "50000.00000000",
    q: "127500000.00000000",
    O: 1748541244435,
    C: 1748627644435,
    F: 1234567,
    L: 1234568,
    n: 45678,
    // Backend calculated fields
    change_1h: 1.0,
    change_4h: -0.5,
    change_8h: 1.8,
    change_12h: -1.2,
    volume_usd: 127500000.0, // volume_base * price = 50000.00 * 2550.00
    volume_base: 50000.0,
    range_position_24h: 66.67,
    normalized_volume_score: 0.1290937499967734, // (volume_usd * 100000) / market_cap / 100
    price: 2550.0,
    change_24h: 2.0,
    high_24h: 2600.0,
    low_24h: 2450.0,
    market_cap: 987654321012.34,
  },
];

const mockCandlestickData = new Map();
mockCandlestickData.set("BTCUSDT", [
  {
    symbol: "BTCUSDT",
    openTime: 1748627100000,
    closeTime: 1748627999999,
    open: "67000.00",
    high: "67500.00",
    low: "66800.00",
    close: "67300.00",
    volume: "123.45",
    interval: "15m",
  },
  {
    symbol: "BTCUSDT",
    openTime: 1748628000000,
    closeTime: 1748628899999,
    open: "67300.00",
    high: "67800.00",
    low: "67100.00",
    close: "67500.00",
    volume: "156.78",
    interval: "15m",
  },
]);

// Mock router with test data
const mockTickerRouter = express.Router();

// Health check endpoint
mockTickerRouter.get("/", (req, res) => {
  res.json({
    message: "Ticker router is running",
    status: "healthy",
    tickerDataCount: mockTickerData.length,
    candlestickSymbols: mockCandlestickData.size,
    rateLimiting: {
      requestsInCurrentWindow: 0,
      maxRequestsPerWindow: 50,
      windowResetTime: new Date(Date.now() + 60000).toISOString(),
    },
  });
});

// Get 24hr ticker data
mockTickerRouter.get("/24hr", (req, res) => {
  try {
    res.json({
      success: true,
      data: mockTickerData,
      count: mockTickerData.length,
      candlestickSymbols: mockCandlestickData.size,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to retrieve ticker data",
    });
  }
});

// Get all available candlestick symbols (must come before :symbol route)
mockTickerRouter.get("/candlestick", (req, res, next) => {
  if (req.path.endsWith("/")) {
    return res.status(404).json({
      success: false,
      error: "Symbol parameter is required",
      path: req.originalUrl
    });
  }
  try {
    const symbols = Array.from(mockCandlestickData.keys());
    const summary = symbols.map((symbol) => ({
      symbol: symbol,
      candleCount: mockCandlestickData.get(symbol).length,
      latestTime:
        mockCandlestickData.get(symbol)[
          mockCandlestickData.get(symbol).length - 1
        ].closeTime,
    }));
    res.json({
      success: true,
      symbols: symbols,
      summary: summary,
      count: symbols.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to retrieve candlestick summary",
    });
  }
});

// Explicitly handle /candlestick/ (trailing slash) as 404 before all other candlestick routes
mockTickerRouter.get("/candlestick/", (req, res) => {
  res.status(404).json({
    success: false,
    error: "Symbol parameter is required",
    path: req.originalUrl
  });
});

// Middleware to catch /candlestick/ and /candlestick/:symbol/ with trailing slash or empty symbol
mockTickerRouter.use((req, res, next) => {
  // Only match /candlestick/ or /candlestick// or /candlestick/:symbol/ (with trailing slash)
  const candlestickPrefix = "/candlestick";
  if (
    req.path === "/candlestick/" ||
    req.path === "/candlestick//" ||
    (/^\/candlestick\/.+\/$/.test(req.path))
  ) {
    return res.status(404).json({
      success: false,
      error: "Invalid endpoint format (trailing slash or empty symbol not allowed)",
      path: req.originalUrl
    });
  }
  next();
});

// Get candlestick data for a specific symbol
mockTickerRouter.get("/candlestick/:symbol", (req, res) => {
  try {
    const symbol = req.params.symbol;
    // Handle empty or whitespace-only symbols
    if (!symbol || symbol.trim() === "") {
      return res.status(404).json({
        success: false,
        error: "Symbol parameter is required",
      });
    }
    const upperSymbol = symbol.toUpperCase();
    const data = mockCandlestickData.get(upperSymbol);
    if (!data) {
      return res.status(404).json({
        success: false,
        error: `No candlestick data available for ${upperSymbol}`,
      });
    }
    res.json({
      success: true,
      symbol: upperSymbol,
      data: data,
      count: data.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to retrieve candlestick data",
    });
  }
});

// Mock market cap endpoint
mockTickerRouter.get("/marketCap", (req, res) => {
  const mockMarketCapData = [
    {
      id: "bitcoin",
      symbol: "btc",
      name: "Bitcoin",
      current_price: 67500,
      market_cap: 1234567890123,
      market_cap_rank: 1,
      price_change_percentage_24h: 1.5,
    },
    {
      id: "ethereum",
      symbol: "eth",
      name: "Ethereum",
      current_price: 2550,
      market_cap: 987654321012,
      market_cap_rank: 2,
      price_change_percentage_24h: 2.0,
    },
  ];

  res.json({
    success: true,
    data: mockMarketCapData,
    count: mockMarketCapData.length,
    timestamp: new Date().toISOString(),
  });
});

// Refresh market cap endpoint
mockTickerRouter.get("/refreshMarketcapData", (req, res) => {
  res.json({
    success: true,
    message: "Market cap data refresh feature is not yet implemented",
  });
});

// Use the mock router
app.use("/api/ticker", mockTickerRouter);

// Documentation endpoints
try {
  const openApiSpec = YAML.load(path.join(__dirname, "..", "openapi.yaml"));

  // Serve swagger UI at /docs/ (no redirect)
  app.use("/docs/", swaggerUi.serve);
  app.get(
    "/docs/",
    swaggerUi.setup(openApiSpec, {
      customCss: ".swagger-ui .topbar { display: none }",
      customSiteTitle: "Spikey Coins API - Test Environment",
    })
  );

  // Handle any other /docs/* routes as 404
  app.get("/docs/*", (req, res) => {
    res.status(404).json({
      success: false,
      error: "Documentation path not found",
      path: req.originalUrl,
    });
  });

  // OpenAPI JSON endpoint
  app.get("/openapi.json", (req, res) => {
    res.json(openApiSpec);
  });
} catch (error) {
  console.error(
    "Warning: Could not load OpenAPI spec for tests:",
    error.message
  );
}

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Spikey Coins Proxy Server - Test Environment",
    version: "1.0.0",
    endpoints: {
      docs: "/docs",
      openapi: "/openapi.json",
      ticker: "/api/ticker",
      ticker24hr: "/api/ticker/24hr",
      candlestick: "/api/ticker/candlestick",
      marketCap: "/api/ticker/marketCap",
    },
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
    path: req.originalUrl,
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error("Test app error:", error);
  res.status(500).json({
    success: false,
    error: "Internal server error",
  });
});

module.exports = app;
