/**
 * Test configuration for the Express app without WebSocket connections
 * This allows us to test HTTP endpoints without starting live data streams
 */

import express, { Application, Request, Response } from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import path from "path";
import logger from "../helpers/logger";
import { TickerData } from "../helpers/dataStore";

// Create Express app
const app: Application = express();

// Enable strict routing so /candlestick and /candlestick/ are different
app.set("strict routing", true);

// Middleware
app.use(cors());
app.use(express.json());

// Mock ticker data for testing
const mockTickerData: TickerData[] = [
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
    change_8h: 2.1,
    change_12h: 3.2,
    volume_usd: 833333340,
    volume_base: 12345.68,
    range_position_24h: 75.0,
    normalized_volume_score: 85.2,
    price: 67500.0,
    change_24h: 1.5,
    high_24h: 68000.0,
    low_24h: 66000.0,
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
    Q: "5.00000000",
    b: "2549.00",
    B: "10.00000000",
    a: "2550.00",
    A: "8.50000000",
    o: "2500.00",
    h: "2600.00",
    l: "2480.00",
    v: "45678.90000000",
    q: "116481295.00000000",
    O: 1748541244435,
    C: 1748627644435,
    F: 7890123,
    L: 7890124,
    n: 156789,
    // Backend calculated fields
    change_1h: 0.8,
    change_4h: 1.5,
    change_8h: 2.8,
    change_12h: 4.1,
    volume_usd: 116481295,
    volume_base: 45678.9,
    range_position_24h: 58.3,
    normalized_volume_score: 72.4,
    price: 2550.0,
    change_24h: 2.0,
    high_24h: 2600.0,
    low_24h: 2480.0,
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
