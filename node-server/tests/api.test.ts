/**
 * Test suite for the main API endpoints
 * Tests the core ticker functionality with mock data
 */

import request from "supertest";
import app from "./testApp";
import { TickerData } from "../helpers/dataStore";

describe("API Endpoints", () => {
  describe("GET /", () => {
    it("should return server information", async () => {
      const response = await request(app).get("/").expect(200);

      expect(response.body).toMatchObject({
        message: "Spikey Coins Proxy Server - Test Environment",
        version: "1.0.0",
        endpoints: expect.objectContaining({
          docs: "/docs",
          openapi: "/openapi.json",
          ticker: "/api/ticker",
          ticker24hr: "/api/ticker/24hr",
        }),
      });
    });
  });

  describe("GET /api/ticker", () => {
    it("should return health check information", async () => {
      const response = await request(app).get("/api/ticker").expect(200);

      expect(response.body).toMatchObject({
        message: "Ticker router is running",
        status: "healthy",
        tickerDataCount: expect.any(Number),
        candlestickSymbols: expect.any(Number),
        rateLimiting: expect.objectContaining({
          requestsInCurrentWindow: expect.any(Number),
          maxRequestsPerWindow: expect.any(Number),
          windowResetTime: expect.any(String),
        }),
      });

      expect(response.body.tickerDataCount).toBeGreaterThan(0);
      expect(response.body.candlestickSymbols).toBeGreaterThanOrEqual(0);
    });
  });

  describe("GET /api/ticker/24hr", () => {
    it("should return ticker data with proper structure", async () => {
      const response = await request(app).get("/api/ticker/24hr").expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array),
        count: expect.any(Number),
        candlestickSymbols: expect.any(Number),
        timestamp: expect.any(String),
      });

      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.count).toBe(response.body.data.length);
    });

    it("should return ticker items with all required backend-calculated fields", async () => {
      const response = await request(app).get("/api/ticker/24hr").expect(200);

      const ticker: TickerData = response.body.data[0];

      // Original Binance fields
      expect(ticker).toHaveProperty("s"); // symbol
      expect(ticker).toHaveProperty("c"); // close price
      expect(ticker).toHaveProperty("o"); // open price
      expect(ticker).toHaveProperty("h"); // high price
      expect(ticker).toHaveProperty("l"); // low price
      expect(ticker).toHaveProperty("v"); // volume
      expect(ticker).toHaveProperty("P"); // price change percentage

      // Backend-calculated fields
      expect(ticker).toHaveProperty("price");
      expect(ticker).toHaveProperty("change_24h");
      expect(ticker).toHaveProperty("high_24h");
      expect(ticker).toHaveProperty("low_24h");
      expect(ticker).toHaveProperty("volume_base");
      expect(ticker).toHaveProperty("volume_usd");
      expect(ticker).toHaveProperty("range_position_24h");
      expect(ticker).toHaveProperty("normalized_volume_score");

      // Data type validations
      expect(typeof ticker.price).toBe("number");
      expect(typeof ticker.change_24h).toBe("number");
      expect(typeof ticker.volume_usd).toBe("number");
      expect(typeof ticker.range_position_24h).toBe("number");
      expect(ticker.range_position_24h).toBeGreaterThanOrEqual(0);
      expect(ticker.range_position_24h).toBeLessThanOrEqual(100);
    });

    it("should include short-term change data when available", async () => {
      const response = await request(app).get("/api/ticker/24hr").expect(200);

      const ticker: TickerData = response.body.data[0];

      // These fields might be present based on available candlestick data
      if (ticker.change_1h !== undefined) {
        expect(typeof ticker.change_1h).toBe("number");
      }
      if (ticker.change_4h !== undefined) {
        expect(typeof ticker.change_4h).toBe("number");
      }
      if (ticker.change_12h !== undefined) {
        expect(typeof ticker.change_12h).toBe("number");
      }
    });

    it("should filter symbols properly", async () => {
      const response = await request(app).get("/api/ticker/24hr").expect(200);

      const tickers: TickerData[] = response.body.data;

      // All symbols should end with USDT or USD
      tickers.forEach((ticker) => {
        expect(ticker.s).toMatch(/USDT?$/);
      });

      // Should include major cryptocurrencies
      const symbols = tickers.map((t) => t.s);
      expect(symbols).toContain("BTCUSDT");
    });

    it("should return data in expected order", async () => {
      const response = await request(app).get("/api/ticker/24hr").expect(200);

      const tickers: TickerData[] = response.body.data; // Data should be sorted by normalized volume score (descending)
      for (let i = 0; i < tickers.length - 1; i++) {
        const currentScore = tickers[i].normalized_volume_score;
        const nextScore = tickers[i + 1].normalized_volume_score;

        if (currentScore !== undefined && nextScore !== undefined) {
          expect(currentScore).toBeGreaterThanOrEqual(nextScore);
        }
      }
    });
  });

  describe("GET /api/ticker/candlestick", () => {
    it("should return candlestick symbols summary", async () => {
      const response = await request(app)
        .get("/api/ticker/candlestick")
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: expect.any(String),
        symbols: expect.any(Array),
        count: expect.any(Number),
      });

      expect(response.body.count).toBe(response.body.symbols.length);
    });

    it("should have proper candlestick symbols format", async () => {
      const response = await request(app)
        .get("/api/ticker/candlestick")
        .expect(200);

      const symbols: string[] = response.body.symbols;

      symbols.forEach((symbol) => {
        expect(typeof symbol).toBe("string");
        expect(symbol).toMatch(/^[A-Z]+USDT?$/);
      });
    });
  });

  describe("GET /api/ticker/candlestick/:symbol", () => {
    it("should return candlestick data for valid symbol", async () => {
      // First get available symbols
      const symbolsResponse = await request(app)
        .get("/api/ticker/candlestick")
        .expect(200);

      if (symbolsResponse.body.symbols.length > 0) {
        const symbol = symbolsResponse.body.symbols[0];

        const response = await request(app)
          .get(`/api/ticker/candlestick/${symbol}`)
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          symbol: symbol,
          data: expect.any(Array),
          count: expect.any(Number),
        });

        expect(response.body.count).toBe(response.body.data.length);

        if (response.body.data.length > 0) {
          const candlestick = response.body.data[0];
          expect(candlestick).toHaveProperty("timestamp");
          expect(candlestick).toHaveProperty("open");
          expect(candlestick).toHaveProperty("high");
          expect(candlestick).toHaveProperty("low");
          expect(candlestick).toHaveProperty("close");
          expect(candlestick).toHaveProperty("volume");
        }
      }
    });

    it("should return 404 for invalid symbol", async () => {
      const response = await request(app)
        .get("/api/ticker/candlestick/INVALIDPAIR")
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining("No candlestick data available"),
      });
    });
  });

  describe("GET /api/ticker/marketCap", () => {
    it("should return market cap data with proper structure", async () => {
      const response = await request(app)
        .get("/api/ticker/marketCap")
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array),
        count: expect.any(Number),
        lastUpdated: expect.any(String),
      });

      expect(response.body.count).toBe(response.body.data.length);
    });

    it("should return market cap items with required fields", async () => {
      const response = await request(app)
        .get("/api/ticker/marketCap")
        .expect(200);

      if (response.body.data.length > 0) {
        const marketCapItem = response.body.data[0];

        expect(marketCapItem).toHaveProperty("symbol");
        expect(marketCapItem).toHaveProperty("market_cap_usd");
        expect(marketCapItem).toHaveProperty("price_usd");

        expect(typeof marketCapItem.symbol).toBe("string");
        expect(typeof marketCapItem.market_cap_usd).toBe("number");
        expect(typeof marketCapItem.price_usd).toBe("number");
      }
    });
  });

  describe("Response Headers and Format", () => {
    it("should return JSON content type", async () => {
      const response = await request(app).get("/api/ticker/24hr").expect(200);

      expect(response.headers["content-type"]).toMatch(/application\/json/);
    });

    it("should include CORS headers", async () => {
      const response = await request(app).get("/api/ticker/24hr").expect(200);

      expect(response.headers).toHaveProperty("access-control-allow-origin");
    });

    it("should return consistent response format", async () => {
      const endpoints = [
        "/api/ticker/24hr",
        "/api/ticker/candlestick",
        "/api/ticker/marketCap",
      ];

      for (const endpoint of endpoints) {
        const response = await request(app).get(endpoint).expect(200);

        expect(response.body).toHaveProperty("success");
        expect(response.body.success).toBe(true);
      }
    });
  });

  describe("Query Parameters", () => {
    it("should handle query parameters gracefully", async () => {
      const response = await request(app)
        .get("/api/ticker/24hr?limit=10")
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it("should ignore unknown query parameters", async () => {
      const response = await request(app)
        .get("/api/ticker/24hr?unknownParam=value")
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe("Rate Limiting Information", () => {
    it("should include rate limiting data in health check", async () => {
      const response = await request(app).get("/api/ticker").expect(200);

      expect(response.body.rateLimiting).toMatchObject({
        requestsInCurrentWindow: expect.any(Number),
        maxRequestsPerWindow: expect.any(Number),
        windowResetTime: expect.any(String),
      });

      expect(
        response.body.rateLimiting.requestsInCurrentWindow
      ).toBeGreaterThanOrEqual(0);
      expect(response.body.rateLimiting.maxRequestsPerWindow).toBeGreaterThan(
        0
      );
    });
  });
});
