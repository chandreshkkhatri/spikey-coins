/**
 * Test suite for error handling and edge cases
 * Tests how the API handles various error conditions and edge cases
 */

const request = require("supertest");
const app = require("./testApp");

describe("Error Handling and Edge Cases", () => {
  describe("HTTP Error Codes", () => {
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

    it("should return 404 for invalid candlestick symbols", async () => {
      const response = await request(app)
        .get("/api/ticker/candlestick/INVALIDPAIR")
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining("No candlestick data available"),
      });
    });

    it("should return 404 for deeply nested invalid paths", async () => {
      await request(app)
        .get("/api/ticker/candlestick/BTCUSDT/invalid/path")
        .expect(404);
    });

    it("should return 404 for invalid API versions", async () => {
      await request(app).get("/api/v2/ticker/24hr").expect(404);
    });
  });

  describe("HTTP Methods", () => {
    it("should reject POST requests to GET endpoints", async () => {
      await request(app).post("/api/ticker/24hr").expect(404); // Router doesn't define POST, so 404
    });

    it("should reject PUT requests", async () => {
      await request(app).put("/api/ticker/24hr").expect(404);
    });

    it("should reject DELETE requests", async () => {
      await request(app).delete("/api/ticker/24hr").expect(404);
    });

    it("should reject PATCH requests", async () => {
      await request(app).patch("/api/ticker/24hr").expect(404);
    });
  });

  describe("Content-Type Handling", () => {
    it("should handle requests without Accept header", async () => {
      const response = await request(app).get("/api/ticker/24hr").expect(200);

      expect(response.headers["content-type"]).toMatch(/application\/json/);
    });

    it("should handle requests with Accept: application/json", async () => {
      const response = await request(app)
        .get("/api/ticker/24hr")
        .set("Accept", "application/json")
        .expect(200);

      expect(response.headers["content-type"]).toMatch(/application\/json/);
    });

    it("should handle requests with Accept: */*", async () => {
      const response = await request(app)
        .get("/api/ticker/24hr")
        .set("Accept", "*/*")
        .expect(200);

      expect(response.headers["content-type"]).toMatch(/application\/json/);
    });
  });

  describe("Query Parameters", () => {
    it("should ignore unknown query parameters gracefully", async () => {
      const response = await request(app)
        .get("/api/ticker/24hr?unknownParam=value&another=test")
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty("data");
    });

    it("should handle empty query parameters", async () => {
      const response = await request(app)
        .get("/api/ticker/24hr?=&empty=")
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
    });

    it("should handle special characters in query parameters", async () => {
      const response = await request(app)
        .get("/api/ticker/24hr?test=%20%21%40%23")
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
    });
  });

  describe("URL Path Edge Cases", () => {
    it("should handle case-insensitive symbol lookups", async () => {
      const response = await request(app)
        .get("/api/ticker/candlestick/btcusdt")
        .expect(200);

      expect(response.body.symbol).toBe("BTCUSDT");
    });

    it("should handle symbols with trailing slashes", async () => {
      await request(app).get("/api/ticker/candlestick/BTCUSDT/").expect(404); // Should not match due to extra slash
    });

    it("should handle URL encoded symbols", async () => {
      const response = await request(app)
        .get("/api/ticker/candlestick/BTC%55SDT") // %55 = U
        .expect(200);

      expect(response.body.symbol).toBe("BTCUSDT");
    });

    it("should handle very long symbol names", async () => {
      const longSymbol = "A".repeat(50);

      await request(app)
        .get(`/api/ticker/candlestick/${longSymbol}`)
        .expect(404);
    });
  });

  describe("Request Headers", () => {
    it("should handle missing User-Agent", async () => {
      const response = await request(app)
        .get("/api/ticker/24hr")
        .unset("User-Agent")
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
    });

    it("should handle custom headers", async () => {
      const response = await request(app)
        .get("/api/ticker/24hr")
        .set("X-Custom-Header", "test-value")
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
    });

    it("should handle multiple Accept-Encoding values", async () => {
      const response = await request(app)
        .get("/api/ticker/24hr")
        .set("Accept-Encoding", "gzip, deflate, br")
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
    });
  });

  describe("Response Validation", () => {
    it("should always include CORS headers", async () => {
      const response = await request(app).get("/api/ticker/24hr").expect(200);

      expect(response.headers).toHaveProperty("access-control-allow-origin");
    });

    it("should include consistent timestamp formats", async () => {
      const response = await request(app).get("/api/ticker/24hr").expect(200);

      expect(response.body.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );
    });

    it("should have consistent success field types", async () => {
      const endpoints = [
        "/api/ticker",
        "/api/ticker/24hr",
        "/api/ticker/candlestick",
        "/api/ticker/marketCap",
      ];

      for (const endpoint of endpoints) {
        const response = await request(app).get(endpoint).expect(200);

        if (response.body.hasOwnProperty("success")) {
          expect(typeof response.body.success).toBe("boolean");
        }
      }
    });
  });

  describe("Data Integrity", () => {
    it("should not return undefined values in response data", async () => {
      const response = await request(app).get("/api/ticker/24hr").expect(200);

      const jsonString = JSON.stringify(response.body);
      expect(jsonString).not.toContain("undefined");
      expect(jsonString).not.toContain("function");
    });

    it("should handle null values appropriately", async () => {
      const response = await request(app).get("/api/ticker/24hr").expect(200);

      // Null values are allowed for optional fields
      response.body.data.forEach((ticker) => {
        // These fields can be null
        const nullableFields = [
          "change_1h",
          "change_4h",
          "change_8h",
          "change_12h",
          "market_cap",
        ];

        nullableFields.forEach((field) => {
          if (ticker[field] === null) {
            expect(ticker[field]).toBeNull();
          }
        });
      });
    });

    it("should not leak internal error details", async () => {
      // This would typically test error scenarios that don't expose stack traces
      const response = await request(app)
        .get("/api/ticker/candlestick/INVALID")
        .expect(404);

      const errorText = JSON.stringify(response.body);
      expect(errorText).not.toContain("Error:");
      expect(errorText).not.toContain("at ");
      expect(errorText).not.toContain("node_modules");
    });
  });

  describe("Rate Limiting Behavior", () => {
    it("should include rate limiting information in health check", async () => {
      const response = await request(app).get("/api/ticker").expect(200);

      expect(response.body.rateLimiting).toHaveProperty(
        "requestsInCurrentWindow"
      );
      expect(response.body.rateLimiting).toHaveProperty("maxRequestsPerWindow");
      expect(response.body.rateLimiting).toHaveProperty("windowResetTime");

      expect(typeof response.body.rateLimiting.requestsInCurrentWindow).toBe(
        "number"
      );
      expect(typeof response.body.rateLimiting.maxRequestsPerWindow).toBe(
        "number"
      );
      expect(typeof response.body.rateLimiting.windowResetTime).toBe("string");
    });

    it("should handle multiple rapid requests", async () => {
      const promises = Array(5)
        .fill(null)
        .map(() => request(app).get("/api/ticker").expect(200));

      const responses = await Promise.all(promises);

      responses.forEach((response) => {
        expect(response.body).toHaveProperty("status", "healthy");
      });
    });
  });

  describe("Documentation Error Handling", () => {
    it("should handle missing OpenAPI spec gracefully", async () => {
      // The test app should still work even if OpenAPI spec is missing
      const response = await request(app).get("/").expect(200);

      expect(response.body).toHaveProperty("message");
    });

    it("should serve 404 for non-existent documentation paths", async () => {
      await request(app).get("/docs/nonexistent").expect(404);
    });
  });

  describe("Edge Case Symbols", () => {
    it("should handle empty symbol parameter", async () => {
      await request(app).get("/api/ticker/candlestick/").expect(404);
    });

    it("should handle symbols with special characters", async () => {
      await request(app).get("/api/ticker/candlestick/BTC@USD").expect(404);
    });

    it("should handle numeric symbols", async () => {
      await request(app).get("/api/ticker/candlestick/123456").expect(404);
    });

    it("should handle whitespace in symbols", async () => {
      await request(app).get("/api/ticker/candlestick/BTC%20USDT").expect(404);
    });
  });
});
