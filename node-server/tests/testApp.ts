/**
 * Test configuration for the Express app without WebSocket connections
 * This allows us to test HTTP endpoints without starting live data streams
 */

import express, { Application, Request, Response } from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import path from "path";
// Mock logger for testing
const logger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};
// import type { Ticker } from "../src/core/DataManager.js";

// Create Express app
const app: Application = express();

// Enable strict routing so /candlestick and /candlestick/ are different
app.set("strict routing", true);

// Middleware
app.use(cors());
app.use(express.json());

// Mock ticker data for testing (matching expected API format)
const mockTickerData: any[] = [
  {
    // Core Binance fields
    symbol: "BTCUSDT",
    lastPrice: "67500.00",
    priceChange: "1000.00",
    priceChangePercent: "1.500",
    highPrice: "68000.00",
    lowPrice: "66000.00",
    volume: "25000.50000000",
    quoteVolume: "1687500000.00000000",
    openTime: 1748540400000,
    closeTime: 1748626800000,
    firstId: 1000000000,
    lastId: 1000500000,
    count: 500000,
    // Raw Binance API field names
    s: "BTCUSDT",
    c: "67500.00",
    o: "66500.00",
    h: "68000.00",
    l: "66000.00",
    v: "25000.50000000",
    P: "1.500",
    // Backend calculated fields
    price: 67500.00,
    change_24h: 1.5,
    high_24h: 68000.00,
    low_24h: 66000.00,
    volume_base: 25000.5,
    volume_usd: 1687533750.00, // 25000.5 * 67500.00
    range_position_24h: 75.0,
    normalized_volume_score: 100.0,
    change_1h: 0.5,
    change_4h: 1.2,
    change_12h: 3.2,
  },
  {
    // Core Binance fields
    symbol: "ETHUSDT",
    lastPrice: "2550.00",
    priceChange: "50.00",
    priceChangePercent: "2.000",
    highPrice: "2600.00",
    lowPrice: "2480.00",
    volume: "15000.50000000",
    quoteVolume: "38250000.00000000",
    openTime: 1748540400000,
    closeTime: 1748626800000,
    firstId: 2000000000,
    lastId: 2000300000,
    count: 300000,
    // Raw Binance API field names
    s: "ETHUSDT",
    c: "2550.00",
    o: "2500.00",
    h: "2600.00",
    l: "2480.00",
    v: "15000.50000000",
    P: "2.000",
    // Backend calculated fields
    price: 2550.00,
    change_24h: 2.0,
    high_24h: 2600.00,
    low_24h: 2480.00,
    volume_base: 15000.5,
    volume_usd: 38251275.00, // 15000.5 * 2550.00
    range_position_24h: 58.33,
    normalized_volume_score: 45.0,
    change_1h: 1.0,
    change_4h: 1.8,
    change_12h: 3.0,
  },
];

// Mock candlestick data for testing
const mockCandlestickData = [
  {
    symbol: "BTCUSDT",
    timestamp: "2025-01-27T10:54:00.000Z",
    openTime: 1748627640000,
    closeTime: 1748627699999,
    open: "67000.00",
    high: "67500.00",
    low: "66800.00",
    close: "67500.00",
    volume: "123.45000000",
    interval: "15m",
  },
  {
    symbol: "BTCUSDT",
    timestamp: "2025-01-27T10:55:00.000Z",
    openTime: 1748627700000,
    closeTime: 1748627759999,
    open: "67500.00",
    high: "67800.00",
    low: "67300.00",
    close: "67600.00",
    volume: "156.78000000",
    interval: "15m",
  },
];

// Mock controller functions for testing
const mockControllers = {
  getHealthCheck: (req: Request, res: Response): void => {
    res.json({
      message: "Ticker router is running",
      status: "healthy",
      tickerDataCount: mockTickerData.length,
      candlestickSymbols: 2,
      rateLimiting: {
        requestsInCurrentWindow: 0,
        maxRequestsPerWindow: 100,
        windowResetTime: new Date(Date.now() + 3600000).toISOString(),
      },
    });
  },

  get24hrTickerData: (req: Request, res: Response): void => {
    res.json({
      success: true,
      data: mockTickerData,
      count: mockTickerData.length,
      candlestickSymbols: 2,
      timestamp: new Date().toISOString(),
    });
  },

  getCandlestickDataBySymbol: (req: Request, res: Response): void => {
    const symbol = req.params.symbol.toUpperCase();
    const interval = (req.query.interval as string) || "15m";

    const data = mockCandlestickData.filter(
      (candle) => candle.symbol === symbol && candle.interval === interval
    );

    if (data.length === 0) {
      res.status(404).json({
        success: false,
        error: `No candlestick data available for ${symbol} at ${interval} interval`,
      });
      return;
    }

    res.json({
      success: true,
      symbol: symbol,
      interval: interval,
      data: data,
      count: data.length,
      timestamp: new Date().toISOString(),
    });
  },

  getCandlestickSummary: (req: Request, res: Response): void => {
    const symbols = ["BTCUSDT", "ETHUSDT"];

    res.json({
      success: true,
      message: "Available candlestick symbols",
      symbols: symbols,
      count: symbols.length,
      timestamp: new Date().toISOString(),
    });
  },

  refreshMarketCapData: (req: Request, res: Response): void => {
    res.json({
      success: true,
      message:
        "Market cap data refresh feature is not yet implemented (TEST MODE)",
    });
  },

  getMarketCapData: (req: Request, res: Response): void => {
    res.json({
      success: true,
      data: [
        {
          symbol: "btc",
          name: "Bitcoin",
          market_cap_usd: 1337500000000,
          price_usd: 67500,
          market_cap_rank: 1,
        },
        {
          symbol: "eth",
          name: "Ethereum",
          market_cap_usd: 306600000000,
          price_usd: 2550,
          market_cap_rank: 2,
        },
      ],
      count: 2,
      lastUpdated: new Date().toISOString(),
    });
  },
};

// Routes setup
const router = express.Router();
router.use(cors());

// Route definitions
router.get("/", mockControllers.getHealthCheck);
router.get("/24hr", mockControllers.get24hrTickerData);
router.get("/candlestick/:symbol", mockControllers.getCandlestickDataBySymbol);
router.get("/candlestick", mockControllers.getCandlestickSummary);
router.get("/refreshMarketcapData", mockControllers.refreshMarketCapData);
router.get("/marketCap", mockControllers.getMarketCapData);

// Mount ticker routes
app.use("/api/ticker", router);

// Load OpenAPI specification for documentation
let swaggerDocument: any;
try {
  const openApiPath = path.resolve(__dirname, "../openapi.yaml");
  swaggerDocument = YAML.load(openApiPath);
} catch (error) {
  logger.warn("Could not load OpenAPI specification for tests");
  swaggerDocument = {
    openapi: "3.0.0",
    info: { title: "Test API", version: "1.0.0" },
    paths: {},
  };
}

// API Documentation (only if swagger doc is available)
if (swaggerDocument) {
  app.use(
    "/docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocument, {
      customSiteTitle: "Spikey Coins API Documentation (TEST MODE)",
      customCss: `
        .swagger-ui .topbar { display: none }
        .swagger-ui .info .title { color: #3b82f6 }
      `,
    })
  );

  // Serve OpenAPI spec as JSON
  app.get("/openapi.json", (req: Request, res: Response) => {
    res.json(swaggerDocument);
  });
}

// Health check endpoint
app.get("/", (req: Request, res: Response) => {
  res.json({
    message: "Spikey Coins Proxy Server - Test Environment",
    version: "1.0.0",
    endpoints: {
      docs: "/docs",
      openapi: "/openapi.json",
      ticker: "/api/ticker",
      ticker24hr: "/api/ticker/24hr",
    },
  });
});

export default app;
