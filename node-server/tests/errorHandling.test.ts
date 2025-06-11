/**
 * Test suite for error handling and edge cases
 * Tests how the API handles various error conditions and edge cases
 */

import request from "supertest";
import app from "./testApp";

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

  describe("Malformed Requests", () => {
    it("should handle requests with invalid JSON", async () => {
      const response = await request(app)
        .post("/api/ticker")
        .set("Content-Type", "application/json")
        .send("invalid json")
        .expect(404); // POST not supported, so 404

      // Even though POST isn't supported, the middleware should handle the malformed JSON gracefully
    });

    it("should handle extremely long URLs", async () => {
      const longPath = "/api/ticker/" + "a".repeat(1000);
      await request(app).get(longPath).expect(404);
    });

    it("should handle URLs with special characters", async () => {
      await request(app).get("/api/ticker/symbols-with-@#$%").expect(404);
    });

    it("should handle URLs with encoded characters", async () => {
      await request(app).get("/api/ticker/%20%21%22").expect(404);
    });
  });

  describe("Edge Case Parameters", () => {
    it("should handle empty symbol parameter", async () => {
      await request(app).get("/api/ticker/candlestick/").expect(404);
    });

    it("should handle symbol with spaces", async () => {
      await request(app).get("/api/ticker/candlestick/BTC USDT").expect(404);
    });

    it("should handle lowercase symbols", async () => {
      await request(app).get("/api/ticker/candlestick/btcusdt").expect(404);
    });

    it("should handle very long symbol names", async () => {
      const longSymbol = "A".repeat(100) + "USDT";
      await request(app)
        .get(`/api/ticker/candlestick/${longSymbol}`)
        .expect(404);
    });
  });

  describe("Data Consistency During Errors", () => {
    it("should maintain data structure during 404 errors", async () => {
      const response = await request(app)
        .get("/api/ticker/nonexistent")
        .expect(404);

      expect(response.body).toHaveProperty("success");
      expect(response.body).toHaveProperty("error");
      expect(response.body.success).toBe(false);
      expect(typeof response.body.error).toBe("string");
    });

    it("should return proper JSON during errors", async () => {
      const response = await request(app)
        .get("/api/ticker/candlestick/INVALIDPAIR")
        .expect(404);

      expect(response.headers["content-type"]).toMatch(/application\/json/);
      expect(response.body).toBeInstanceOf(Object);
    });
  });

  describe("Rate Limiting Edge Cases", () => {
    it("should handle rate limiting information during high load", async () => {
      // Make multiple rapid requests
      const requests = Array(10)
        .fill(null)
        .map(() => request(app).get("/api/ticker"));

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.rateLimiting).toBeDefined();
      });
    });
  });

  describe("Content Type Handling", () => {
    it("should handle requests with unsupported content types", async () => {
      const response = await request(app)
        .get("/api/ticker/24hr")
        .set("Accept", "text/plain")
        .expect(200);

      // Should still return JSON even if client requests plain text
      expect(response.headers["content-type"]).toMatch(/application\/json/);
    });

    it("should handle requests without Accept header", async () => {
      const response = await request(app).get("/api/ticker/24hr").expect(200);

      expect(response.headers["content-type"]).toMatch(/application\/json/);
      expect(response.body.success).toBe(true);
    });
  });

  describe("Memory and Performance Edge Cases", () => {
    it("should handle large concurrent request loads", async () => {
      const startTime = Date.now();

      const requests = Array(20)
        .fill(null)
        .map(() => request(app).get("/api/ticker/24hr"));

      const responses = await Promise.all(requests);
      const endTime = Date.now();

      // All requests should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // Should handle concurrent load reasonably fast
      expect(endTime - startTime).toBeLessThan(5000);
    });

    it("should maintain data consistency across concurrent requests", async () => {
      const requests = Array(5)
        .fill(null)
        .map(() => request(app).get("/api/ticker/24hr"));

      const responses = await Promise.all(requests);

      // All responses should have the same data structure
      const firstResponse = responses[0].body;
      responses.forEach((response) => {
        expect(response.body.success).toBe(firstResponse.success);
        expect(response.body.data.length).toBe(firstResponse.data.length);
        expect(response.body.count).toBe(firstResponse.count);
      });
    });
  });

  describe("Header Validation", () => {
    it("should handle missing standard headers gracefully", async () => {
      const response = await request(app)
        .get("/api/ticker/24hr")
        .unset("User-Agent")
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it("should handle custom headers", async () => {
      const response = await request(app)
        .get("/api/ticker/24hr")
        .set("X-Custom-Header", "test-value")
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe("Path Traversal Security", () => {
    it("should prevent path traversal attempts", async () => {
      await request(app).get("/api/ticker/../../../etc/passwd").expect(404);
    });

    it("should handle encoded path traversal attempts", async () => {
      await request(app)
        .get("/api/ticker/%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd")
        .expect(404);
    });

    it("should handle double encoded attempts", async () => {
      await request(app)
        .get("/api/ticker/%252e%252e%252f%252e%252e%252fetc%252fpasswd")
        .expect(404);
    });
  });

  describe("Response Integrity", () => {
    it("should maintain response structure even during edge cases", async () => {
      const response = await request(app)
        .get("/api/ticker/candlestick/INVALIDPAIR")
        .expect(404);

      // Should always have these keys in error responses
      expect(response.body).toHaveProperty("success");
      expect(response.body).toHaveProperty("error");
      expect(response.body.success).toBe(false);
    });

    it("should provide meaningful error messages", async () => {
      const response = await request(app)
        .get("/api/ticker/candlestick/INVALIDPAIR")
        .expect(404);

      expect(response.body.error).toBeTruthy();
      expect(typeof response.body.error).toBe("string");
      expect(response.body.error.length).toBeGreaterThan(10);
    });
  });

  describe("Graceful Degradation", () => {
    it("should handle partial data scenarios gracefully", async () => {
      // This test ensures the API handles scenarios where some data might be missing
      const response = await request(app).get("/api/ticker/24hr").expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it("should provide fallback data when external services are unavailable", async () => {
      // Even in test mode with mock data, the API should respond
      const response = await request(app)
        .get("/api/ticker/marketCap")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });
});
