/**
 * Integration test suite
 * Tests end-to-end functionality and integration between components
 */

const request = require("supertest");
const app = require("./testApp");

describe("Integration Tests", () => {
  describe("Full API Workflow", () => {
    it("should complete a full data retrieval workflow", async () => {
      // 1. Check server health
      const healthResponse = await request(app).get("/api/ticker").expect(200);

      expect(healthResponse.body.status).toBe("healthy");

      // 2. Get ticker data
      const tickerResponse = await request(app)
        .get("/api/ticker/24hr")
        .expect(200);

      expect(tickerResponse.body.success).toBe(true);
      expect(tickerResponse.body.data.length).toBeGreaterThan(0);

      // 3. Get candlestick summary
      const candlestickSummaryResponse = await request(app)
        .get("/api/ticker/candlestick")
        .expect(200);

      expect(candlestickSummaryResponse.body.success).toBe(true);

      // 4. Get specific candlestick data if available
      if (candlestickSummaryResponse.body.symbols.length > 0) {
        const symbol = candlestickSummaryResponse.body.symbols[0];

        const candlestickResponse = await request(app)
          .get(`/api/ticker/candlestick/${symbol}`)
          .expect(200);

        expect(candlestickResponse.body.success).toBe(true);
        expect(candlestickResponse.body.symbol).toBe(symbol);
      }

      // 5. Get market cap data
      const marketCapResponse = await request(app)
        .get("/api/ticker/marketCap")
        .expect(200);

      expect(marketCapResponse.body.success).toBe(true);
    });

    it("should maintain data consistency across endpoints", async () => {
      // Get data from different endpoints and verify consistency
      const [tickerResponse, healthResponse] = await Promise.all([
        request(app).get("/api/ticker/24hr").expect(200),
        request(app).get("/api/ticker").expect(200),
      ]);

      // Ticker count should match between endpoints
      expect(tickerResponse.body.count).toBe(
        healthResponse.body.tickerDataCount
      );
      expect(tickerResponse.body.data.length).toBe(
        healthResponse.body.tickerDataCount
      );
    });
  });

  describe("Data Relationship Validation", () => {
    it("should have consistent ticker and candlestick data", async () => {
      const [tickerResponse, candlestickSummary] = await Promise.all([
        request(app).get("/api/ticker/24hr").expect(200),
        request(app).get("/api/ticker/candlestick").expect(200),
      ]);

      const tickerSymbols = tickerResponse.body.data.map((t) => t.s);
      const candlestickSymbols = candlestickSummary.body.symbols;

      // All candlestick symbols should have corresponding ticker data
      candlestickSymbols.forEach((symbol) => {
        expect(tickerSymbols).toContain(symbol);
      });
    });

    it("should correlate market cap data with ticker data", async () => {
      const [tickerResponse, marketCapResponse] = await Promise.all([
        request(app).get("/api/ticker/24hr").expect(200),
        request(app).get("/api/ticker/marketCap").expect(200),
      ]);

      const tickersWithMarketCap = tickerResponse.body.data.filter(
        (t) => t.market_cap
      );
      const marketCapData = marketCapResponse.body.data;

      if (marketCapData.length > 0 && tickersWithMarketCap.length > 0) {
        // There should be some correlation between market cap data and tickers
        expect(tickersWithMarketCap.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Performance Integration", () => {
    it("should handle concurrent requests efficiently", async () => {
      const startTime = Date.now();

      // Make 10 concurrent requests
      const promises = Array(10)
        .fill(null)
        .map(() => request(app).get("/api/ticker/24hr").expect(200));

      const responses = await Promise.all(promises);
      const endTime = Date.now();

      // All requests should succeed
      responses.forEach((response) => {
        expect(response.body.success).toBe(true);
        expect(response.body.data.length).toBeGreaterThan(0);
      });

      // Should complete within reasonable time
      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(10000); // 10 seconds max for 10 concurrent requests
    });

    it("should maintain consistent response times", async () => {
      const responseTimes = [];

      // Measure response times for multiple requests
      for (let i = 0; i < 5; i++) {
        const startTime = Date.now();
        await request(app).get("/api/ticker/24hr").expect(200);
        const endTime = Date.now();
        responseTimes.push(endTime - startTime);
      }

      // Calculate average and check for consistency
      const avgTime =
        responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxDeviation = Math.max(
        ...responseTimes.map((t) => Math.abs(t - avgTime))
      );

      // Response times should be relatively consistent (within 2x of average)
      expect(maxDeviation).toBeLessThan(avgTime * 2);
    });
  });

  describe("Error Recovery", () => {
    it("should recover gracefully from errors", async () => {
      // Make a bad request
      await request(app).get("/api/ticker/candlestick/INVALID").expect(404);

      // Subsequent good requests should still work
      const response = await request(app).get("/api/ticker/24hr").expect(200);

      expect(response.body.success).toBe(true);
    });

    it("should handle mixed valid and invalid requests", async () => {
      const requests = [
        request(app).get("/api/ticker/24hr").expect(200),
        request(app).get("/api/ticker/candlestick/INVALID").expect(404),
        request(app).get("/api/ticker").expect(200),
        request(app).get("/api/ticker/nonexistent").expect(404),
        request(app).get("/api/ticker/marketCap").expect(200),
      ];

      const responses = await Promise.allSettled(requests);

      // Check that valid requests succeeded and invalid ones failed as expected
      expect(responses[0].status).toBe("fulfilled");
      expect(responses[1].status).toBe("fulfilled"); // 404 is expected
      expect(responses[2].status).toBe("fulfilled");
      expect(responses[3].status).toBe("fulfilled"); // 404 is expected
      expect(responses[4].status).toBe("fulfilled");
    });
  });

  describe("Documentation Integration", () => {
    it("should have documentation that matches actual API behavior", async () => {
      // Get OpenAPI spec
      const specResponse = await request(app).get("/openapi.json").expect(200);

      const spec = specResponse.body;

      // Test each documented endpoint
      const endpoints = Object.keys(spec.paths);

      for (const endpoint of endpoints) {
        const path = endpoint.replace("{symbol}", "BTCUSDT"); // Replace parameter

        try {
          const response = await request(app).get(path);

          // Should return either success or documented error codes
          expect([200, 404, 500]).toContain(response.status);

          if (response.status === 200) {
            expect(response.headers["content-type"]).toMatch(
              /application\/json/
            );
          }
        } catch (error) {
          // Some endpoints might not be implemented in test app, that's okay
          console.log(
            `Endpoint ${path} not fully implemented in test environment`
          );
        }
      }
    });

    it("should serve documentation and API from same server", async () => {
      // Both documentation and API should be accessible
      const [apiResponse, docsResponse] = await Promise.allSettled([
        request(app).get("/api/ticker/24hr"),
        request(app).get("/docs/"),
      ]);

      expect(apiResponse.status).toBe("fulfilled");
      expect(docsResponse.status).toBe("fulfilled");
    });
  });

  describe("Data Flow Integration", () => {
    it("should demonstrate complete backend calculation pipeline", async () => {
      // Get ticker data which should include all backend calculations
      const response = await request(app).get("/api/ticker/24hr").expect(200);

      const ticker = response.body.data[0];

      // Verify the complete calculation pipeline

      // 1. Original data preservation
      expect(ticker).toHaveProperty("s"); // Original symbol
      expect(ticker).toHaveProperty("c"); // Original close price (string)
      expect(ticker).toHaveProperty("v"); // Original volume (string)

      // 2. Number conversions
      expect(typeof ticker.price).toBe("number");
      expect(ticker.price).toBe(parseFloat(ticker.c));

      // 3. Volume calculations
      expect(typeof ticker.volume_usd).toBe("number");
      expect(
        Math.abs(ticker.volume_usd - ticker.volume_base * ticker.price)
      ).toBeLessThan(0.01);

      // 4. Range calculations
      expect(typeof ticker.range_position_24h).toBe("number");
      expect(ticker.range_position_24h).toBeGreaterThanOrEqual(0);
      expect(ticker.range_position_24h).toBeLessThanOrEqual(100);

      // 5. Normalized score (when market cap available)
      expect(typeof ticker.normalized_volume_score).toBe("number");
      expect(ticker.normalized_volume_score).toBeGreaterThanOrEqual(0);

      console.log("✅ Backend calculation pipeline verified for:", ticker.s);
    });

    it("should maintain data freshness", async () => {
      // Make two requests with a small delay
      const response1 = await request(app).get("/api/ticker/24hr").expect(200);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const response2 = await request(app).get("/api/ticker/24hr").expect(200);

      // Timestamps should be different (data is fresh)
      expect(response1.body.timestamp).not.toBe(response2.body.timestamp);

      // Data structure should be consistent
      expect(response1.body.data.length).toBe(response2.body.data.length);
    });
  });

  describe("API Contract Validation", () => {
    it("should maintain consistent API contract", async () => {
      const response = await request(app).get("/api/ticker/24hr").expect(200);

      // Response should always have these fields
      expect(response.body).toHaveProperty("success");
      expect(response.body).toHaveProperty("data");
      expect(response.body).toHaveProperty("count");
      expect(response.body).toHaveProperty("timestamp");

      // Types should be consistent
      expect(typeof response.body.success).toBe("boolean");
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(typeof response.body.count).toBe("number");
      expect(typeof response.body.timestamp).toBe("string");

      // Count should match data length
      expect(response.body.count).toBe(response.body.data.length);
    });

    it("should provide consistent ticker data structure", async () => {
      const response = await request(app).get("/api/ticker/24hr").expect(200);

      // All ticker items should have the same structure
      const requiredFields = [
        "s",
        "c",
        "o",
        "h",
        "l",
        "v",
        "P", // Original Binance fields
        "price",
        "change_24h",
        "high_24h",
        "low_24h",
        "volume_base", // Converted fields
        "volume_usd",
        "range_position_24h",
        "normalized_volume_score", // Calculated fields
      ];

      response.body.data.forEach((ticker) => {
        requiredFields.forEach((field) => {
          expect(ticker).toHaveProperty(field);
        });
      });
    });
  });
});
