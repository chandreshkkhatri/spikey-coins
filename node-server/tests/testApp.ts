/**
 * Test configuration for the Express app without WebSocket connections
 * This allows us to test HTTP endpoints without starting live data streams
 */

import express, { Application, Request, Response } from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import path from "path";
import logger from "../src/utils/logger.js";
import type { Ticker } from "../src/data/models/Ticker.js";

// Create Express app
const app: Application = express();

// Enable strict routing so /candlestick and /candlestick/ are different
app.set("strict routing", true);

// Middleware
app.use(cors());
app.use(express.json());

// Mock ticker data for testing (simplified for test purposes)
const mockTickerData: Ticker[] = [
  {
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
    change_1h: 0.5,
    change_4h: 1.2,
    change_8h: 2.1,
    change_12h: 3.2,
  },
  {
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
    change_1h: 1.0,
    change_4h: 1.8,
    change_8h: 2.5,
    change_12h: 3.0,
  },
];

// Mock candlestick data for testing
const mockCandlestickData = [
  {
    symbol: "BTCUSDT",
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
      message: "Ticker router is running (TEST MODE)",
      status: "healthy",
      tickerDataCount: mockTickerData.length,
      candlestickSymbols: 2,
      rateLimiting: {
        requestCount: 0,
        lastRequestTime: Date.now(),
        isWithinLimit: true,
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
    const summary = symbols.map((symbol) => ({
      symbol: symbol,
      intervals: {
        "15m": {
          candleCount: mockCandlestickData.filter((c) => c.symbol === symbol)
            .length,
          latestTime:
            mockCandlestickData.filter((c) => c.symbol === symbol).slice(-1)[0]
              ?.closeTime || null,
        },
      },
      totalIntervals: 1,
    }));

    res.json({
      success: true,
      symbols: symbols,
      summary: summary,
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
          id: "bitcoin",
          symbol: "btc",
          name: "Bitcoin",
          current_price: 67500,
          market_cap: 1337500000000,
          market_cap_rank: 1,
        },
        {
          id: "ethereum",
          symbol: "eth",
          name: "Ethereum",
          current_price: 2550,
          market_cap: 306600000000,
          market_cap_rank: 2,
        },
      ],
      count: 2,
      timestamp: new Date().toISOString(),
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
    message: "Spikey Coins Proxy Server (TEST MODE)",
    description: "Test environment for API endpoints",
    status: "healthy",
    timestamp: new Date().toISOString(),
    documentation: {
      swaggerUI: "http://localhost:8000/docs",
      openAPISpec: "http://localhost:8000/openapi.json",
    },
  });
});

export default app;
