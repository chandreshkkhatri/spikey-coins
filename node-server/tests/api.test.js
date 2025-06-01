/**
 * Test suite for the main API endpoints
 * Tests the core ticker functionality with mock data
 */

const request = require("supertest");
const app = require("./testApp");

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

      const ticker = response.body.data[0];

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

      const ticker = response.body.data[0];

      // Short-term changes (may be null if no candlestick data)
      expect(ticker).toHaveProperty("change_1h");
      expect(ticker).toHaveProperty("change_4h");
      expect(ticker).toHaveProperty("change_8h");
      expect(ticker).toHaveProperty("change_12h");

      // If present, should be numbers
      if (ticker.change_1h !== null) {
        expect(typeof ticker.change_1h).toBe("number");
      }
    });

    it("should calculate volume_usd correctly", async () => {
      const response = await request(app).get("/api/ticker/24hr").expect(200);

      const ticker = response.body.data[0];
      const expectedVolumeUsd = ticker.volume_base * ticker.price;

      // Allow for small floating point differences
      expect(Math.abs(ticker.volume_usd - expectedVolumeUsd)).toBeLessThan(
        0.01
      );
    });
  });

  describe("GET /api/ticker/candlestick", () => {
    it("should return candlestick summary", async () => {
      const response = await request(app)
        .get("/api/ticker/candlestick")
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        symbols: expect.any(Array),
        summary: expect.any(Array),
        count: expect.any(Number),
        timestamp: expect.any(String),
      });

      expect(response.body.count).toBe(response.body.symbols.length);
      expect(response.body.count).toBe(response.body.summary.length);
    });

    it("should include proper summary information for each symbol", async () => {
      const response = await request(app)
        .get("/api/ticker/candlestick")
        .expect(200);

      if (response.body.summary.length > 0) {
        const summaryItem = response.body.summary[0];

        expect(summaryItem).toHaveProperty("symbol");
        expect(summaryItem).toHaveProperty("candleCount");
        expect(summaryItem).toHaveProperty("latestTime");

        expect(typeof summaryItem.symbol).toBe("string");
        expect(typeof summaryItem.candleCount).toBe("number");
        expect(summaryItem.candleCount).toBeGreaterThan(0);
      }
    });
  });

  describe("GET /api/ticker/candlestick/:symbol", () => {
    it("should return candlestick data for valid symbol", async () => {
      const response = await request(app)
        .get("/api/ticker/candlestick/BTCUSDT")
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        symbol: "BTCUSDT",
        data: expect.any(Array),
        count: expect.any(Number),
        timestamp: expect.any(String),
      });

      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.count).toBe(response.body.data.length);
    });

    it("should return proper candlestick structure", async () => {
      const response = await request(app)
        .get("/api/ticker/candlestick/BTCUSDT")
        .expect(200);

      const candlestick = response.body.data[0];

      expect(candlestick).toHaveProperty("symbol");
      expect(candlestick).toHaveProperty("openTime");
      expect(candlestick).toHaveProperty("closeTime");
      expect(candlestick).toHaveProperty("open");
      expect(candlestick).toHaveProperty("high");
      expect(candlestick).toHaveProperty("low");
      expect(candlestick).toHaveProperty("close");
      expect(candlestick).toHaveProperty("volume");
      expect(candlestick).toHaveProperty("interval");

      expect(typeof candlestick.openTime).toBe("number");
      expect(typeof candlestick.closeTime).toBe("number");
      expect(candlestick.interval).toBe("15m");
    });

    it("should return 404 for invalid symbol", async () => {
      const response = await request(app)
        .get("/api/ticker/candlestick/INVALID")
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining("No candlestick data available"),
      });
    });

    it("should handle case-insensitive symbol lookup", async () => {
      const response = await request(app)
        .get("/api/ticker/candlestick/btcusdt")
        .expect(200);

      expect(response.body.symbol).toBe("BTCUSDT");
    });
  });

  describe("GET /api/ticker/marketCap", () => {
    it("should return market cap data", async () => {
      const response = await request(app)
        .get("/api/ticker/marketCap")
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array),
        count: expect.any(Number),
        timestamp: expect.any(String),
      });

      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.count).toBe(response.body.data.length);
    });

    it("should return proper market cap structure", async () => {
      const response = await request(app)
        .get("/api/ticker/marketCap")
        .expect(200);

      const marketCapItem = response.body.data[0];

      expect(marketCapItem).toHaveProperty("id");
      expect(marketCapItem).toHaveProperty("symbol");
      expect(marketCapItem).toHaveProperty("name");
      expect(marketCapItem).toHaveProperty("current_price");
      expect(marketCapItem).toHaveProperty("market_cap");
      expect(marketCapItem).toHaveProperty("market_cap_rank");

      expect(typeof marketCapItem.current_price).toBe("number");
      expect(typeof marketCapItem.market_cap).toBe("number");
      expect(typeof marketCapItem.market_cap_rank).toBe("number");
    });
  });

  describe("GET /api/ticker/refreshMarketcapData", () => {
    it("should acknowledge refresh request", async () => {
      const response = await request(app)
        .get("/api/ticker/refreshMarketcapData")
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: expect.any(String),
      });
    });
  });

  describe("Error handling", () => {
    it("should return 404 for non-existent endpoints", async () => {
      const response = await request(app)
        .get("/api/ticker/nonexistent")
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.any(String),
        path: "/api/ticker/nonexistent",
      });
    });

    it("should handle invalid JSON gracefully", async () => {
      const response = await request(app)
        .post("/api/ticker/24hr")
        .send("invalid json")
        .expect(404); // Since POST is not implemented, it should 404
    });
  });
});
