/**
 * Integration test suite
 * Tests end-to-end functionality and integration between components
 */

import request from "supertest";
import app from "./testApp";
import type { Ticker } from "../src/data/models/Ticker.js";

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

    it("should maintain data consistency across multiple requests", async () => {
      // Get ticker data multiple times and verify consistency
      const responses = await Promise.all([
        request(app).get("/api/ticker/24hr"),
        request(app).get("/api/ticker/24hr"),
        request(app).get("/api/ticker/24hr"),
      ]);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // Data structure should be consistent
      const firstResponse = responses[0].body;
      const secondResponse = responses[1].body;

      expect(firstResponse.data.length).toBe(secondResponse.data.length);
      expect(firstResponse.count).toBe(secondResponse.count);

      // Same symbols should be present
      const firstSymbols = firstResponse.data.map((t: Ticker) => t.s).sort();
      const secondSymbols = secondResponse.data.map((t: Ticker) => t.s).sort();
      expect(firstSymbols).toEqual(secondSymbols);
    });
  });

  describe("Cross-Endpoint Data Validation", () => {
    it("should have consistent symbol data across endpoints", async () => {
      // Get data from multiple endpoints
      const [tickerResponse, candlestickSummaryResponse] = await Promise.all([
        request(app).get("/api/ticker/24hr"),
        request(app).get("/api/ticker/candlestick"),
      ]);

      expect(tickerResponse.status).toBe(200);
      expect(candlestickSummaryResponse.status).toBe(200);

      const tickerSymbols = tickerResponse.body.data.map((t: Ticker) => t.s);
      const candlestickSymbols = candlestickSummaryResponse.body.symbols;

      // Candlestick symbols should be a subset of ticker symbols
      candlestickSymbols.forEach((symbol: string) => {
        expect(tickerSymbols).toContain(symbol);
      });
    });

    it("should maintain symbol format consistency", async () => {
      const endpoints = [
        "/api/ticker/24hr",
        "/api/ticker/candlestick",
        "/api/ticker/marketCap",
      ];

      const responses = await Promise.all(
        endpoints.map((endpoint) => request(app).get(endpoint))
      );

      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });

      // Extract symbols from each endpoint
      const tickerSymbols = responses[0].body.data.map((t: Ticker) => t.s);
      const candlestickSymbols = responses[1].body.symbols;
      const marketCapSymbols = responses[2].body.data.map(
        (item: any) => item.symbol
      );

      // All symbols should follow the same format (uppercase, ending with USDT/USD)
      const symbolRegex = /^[A-Z]+USDT?$/;

      tickerSymbols.forEach((symbol: string) => {
        expect(symbol).toMatch(symbolRegex);
      });

      candlestickSymbols.forEach((symbol: string) => {
        expect(symbol).toMatch(symbolRegex);
      });

      marketCapSymbols.forEach((symbol: string) => {
        expect(symbol).toMatch(symbolRegex);
      });
    });
  });

  describe("Performance and Load Testing", () => {
    it("should handle sequential requests efficiently", async () => {
      const startTime = Date.now();

      // Make 10 sequential requests
      for (let i = 0; i < 10; i++) {
        const response = await request(app).get("/api/ticker/24hr");
        expect(response.status).toBe(200);
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should complete 10 requests in reasonable time
      expect(totalTime).toBeLessThan(5000);
    });

    it("should handle concurrent requests efficiently", async () => {
      const startTime = Date.now();

      // Make 10 concurrent requests
      const requests = Array(10)
        .fill(null)
        .map(() => request(app).get("/api/ticker/24hr"));

      const responses = await Promise.all(requests);
      const endTime = Date.now();

      // All requests should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(3000);
    });

    it("should maintain performance across different endpoints", async () => {
      const endpoints = [
        "/api/ticker",
        "/api/ticker/24hr",
        "/api/ticker/candlestick",
        "/api/ticker/marketCap",
      ];

      const startTime = Date.now();

      // Test each endpoint multiple times
      const requests = endpoints.flatMap((endpoint) =>
        Array(3)
          .fill(null)
          .map(() => request(app).get(endpoint))
      );

      const responses = await Promise.all(requests);
      const endTime = Date.now();

      // All requests should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });

      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(6000);
    });
  });

  describe("Data Flow Integration", () => {
    it("should show proper data flow from ticker to candlestick endpoints", async () => {
      // 1. Get ticker data
      const tickerResponse = await request(app)
        .get("/api/ticker/24hr")
        .expect(200);

      const tickerData: Ticker[] = tickerResponse.body.data;
      expect(tickerData.length).toBeGreaterThan(0);

      // 2. Get candlestick symbols
      const candlestickSummaryResponse = await request(app)
        .get("/api/ticker/candlestick")
        .expect(200);

      const availableSymbols: string[] =
        candlestickSummaryResponse.body.symbols;

      // 3. If candlestick data is available, verify it complements ticker data
      if (availableSymbols.length > 0) {
        const testSymbol = availableSymbols[0];

        // Find corresponding ticker data
        const correspondingTicker = tickerData.find((t) => t.s === testSymbol);
        expect(correspondingTicker).toBeDefined();

        // Get candlestick data for this symbol
        const candlestickResponse = await request(app)
          .get(`/api/ticker/candlestick/${testSymbol}`)
          .expect(200);

        expect(candlestickResponse.body.symbol).toBe(testSymbol);
        expect(candlestickResponse.body.success).toBe(true);
      }
    });

    it("should integrate rate limiting data across requests", async () => {
      // 1. Get initial rate limiting status
      const initialResponse = await request(app).get("/api/ticker").expect(200);
      const initialRateLimit = initialResponse.body.rateLimiting;

      expect(initialRateLimit).toHaveProperty("requestsInCurrentWindow");
      expect(initialRateLimit).toHaveProperty("maxRequestsPerWindow");

      // 2. Make several requests
      await Promise.all([
        request(app).get("/api/ticker/24hr"),
        request(app).get("/api/ticker/candlestick"),
        request(app).get("/api/ticker/marketCap"),
      ]);

      // 3. Check rate limiting status again
      const finalResponse = await request(app).get("/api/ticker").expect(200);
      const finalRateLimit = finalResponse.body.rateLimiting;

      // Requests should have been counted
      expect(finalRateLimit.requestsInCurrentWindow).toBeGreaterThanOrEqual(
        initialRateLimit.requestsInCurrentWindow
      );
    });
  });

  describe("Error Recovery and Resilience", () => {
    it("should recover gracefully from bad requests", async () => {
      // Make a bad request
      await request(app).get("/api/ticker/invalid").expect(404);

      // Subsequent good requests should still work
      const response = await request(app).get("/api/ticker/24hr").expect(200);
      expect(response.body.success).toBe(true);
    });

    it("should maintain service availability during high error rates", async () => {
      // Generate multiple 404 errors
      const badRequests = Array(5)
        .fill(null)
        .map(() => request(app).get("/api/ticker/invalid"));

      await Promise.all(badRequests);

      // Service should still be available
      const goodRequests = Array(5)
        .fill(null)
        .map(() => request(app).get("/api/ticker/24hr"));

      const responses = await Promise.all(goodRequests);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });

  describe("Documentation Integration", () => {
    it("should serve documentation alongside API", async () => {
      // Test that docs are available
      const docsResponse = await request(app).get("/docs/").expect(200);
      expect(docsResponse.text).toContain("swagger-ui");

      // Test OpenAPI spec
      const specResponse = await request(app).get("/openapi.json").expect(200);
      expect(specResponse.body).toHaveProperty("openapi");
      expect(specResponse.body).toHaveProperty("paths");

      // API should still work
      const apiResponse = await request(app)
        .get("/api/ticker/24hr")
        .expect(200);
      expect(apiResponse.body.success).toBe(true);
    });
  });

  describe("Environment and Configuration Integration", () => {
    it("should operate correctly in test environment", async () => {
      // Verify test environment setup
      expect(process.env.NODE_ENV).toBe("test");

      // API should return test environment indicators
      const response = await request(app).get("/").expect(200);
      expect(response.body.message).toContain("Test Environment");
    });

    it("should use test configuration consistently", async () => {
      // All endpoints should recognize test environment
      const endpoints = [
        "/",
        "/api/ticker",
        "/api/ticker/24hr",
        "/api/ticker/candlestick",
        "/api/ticker/marketCap",
      ];

      const responses = await Promise.all(
        endpoints.map((endpoint) => request(app).get(endpoint))
      );

      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });

      // Root endpoint should indicate test environment
      expect(responses[0].body.message).toContain("Test Environment");
    });
  });

  describe("Complete User Journey", () => {
    it("should support a complete user workflow", async () => {
      // 1. User discovers the API
      const rootResponse = await request(app).get("/").expect(200);
      expect(rootResponse.body.endpoints).toBeDefined();

      // 2. User checks API health
      const healthResponse = await request(app).get("/api/ticker").expect(200);
      expect(healthResponse.body.status).toBe("healthy");

      // 3. User gets ticker data
      const tickerResponse = await request(app)
        .get("/api/ticker/24hr")
        .expect(200);
      expect(tickerResponse.body.success).toBe(true);

      // 4. User explores candlestick data
      const candlestickSummaryResponse = await request(app)
        .get("/api/ticker/candlestick")
        .expect(200);
      expect(candlestickSummaryResponse.body.success).toBe(true);

      // 5. User checks market cap data
      const marketCapResponse = await request(app)
        .get("/api/ticker/marketCap")
        .expect(200);
      expect(marketCapResponse.body.success).toBe(true);

      // 6. User views documentation
      const docsResponse = await request(app).get("/docs/").expect(200);
      expect(docsResponse.text).toContain("swagger-ui");

      // All responses should be valid and consistent
      expect(tickerResponse.body.data.length).toBeGreaterThan(0);
      expect(marketCapResponse.body.data.length).toBeGreaterThanOrEqual(0);
    });
  });
});
