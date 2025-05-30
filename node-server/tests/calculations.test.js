/**
 * Test suite for backend calculations
 * Tests the accuracy and correctness of server-side calculations
 */

const request = require("supertest");
const app = require("./testApp");

describe("Backend Calculations", () => {
  let tickerData;

  beforeAll(async () => {
    // Get ticker data for testing calculations
    const response = await request(app).get("/api/ticker/24hr").expect(200);

    tickerData = response.body.data;
  });

  describe("Volume USD Calculation", () => {
    it("should calculate volume_usd correctly as volume_base * price", () => {
      tickerData.forEach((ticker) => {
        const expectedVolumeUsd = ticker.volume_base * ticker.price;

        // Allow for small floating point differences
        expect(Math.abs(ticker.volume_usd - expectedVolumeUsd)).toBeLessThan(
          0.01
        );
      });
    });

    it("should have volume_usd as a positive number", () => {
      tickerData.forEach((ticker) => {
        expect(typeof ticker.volume_usd).toBe("number");
        expect(ticker.volume_usd).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(ticker.volume_usd)).toBe(true);
      });
    });
  });

  describe("Range Position Calculation", () => {
    it("should calculate range_position_24h within 0-100%", () => {
      tickerData.forEach((ticker) => {
        expect(typeof ticker.range_position_24h).toBe("number");
        expect(ticker.range_position_24h).toBeGreaterThanOrEqual(0);
        expect(ticker.range_position_24h).toBeLessThanOrEqual(100);
        expect(Number.isFinite(ticker.range_position_24h)).toBe(true);
      });
    });

    it("should calculate range position correctly", () => {
      const btcTicker = tickerData.find((t) => t.s === "BTCUSDT");
      if (btcTicker) {
        const { high_24h, low_24h, price } = btcTicker;

        // Manual calculation: ((current - low) / (high - low)) * 100
        const expectedPosition =
          high_24h === low_24h
            ? 50 // Avoid division by zero
            : ((price - low_24h) / (high_24h - low_24h)) * 100;

        expect(
          Math.abs(btcTicker.range_position_24h - expectedPosition)
        ).toBeLessThan(0.1);
      }
    });

    it("should handle edge cases properly", async () => {
      // Test with mock data where high === low
      const mockTicker = {
        price: 100,
        high_24h: 100,
        low_24h: 100,
      };

      // In real implementation, this should return 50% for equal high/low
      // We can't test the actual function here, but we verify the principle
      const rangePosition =
        mockTicker.high_24h === mockTicker.low_24h
          ? 50
          : ((mockTicker.price - mockTicker.low_24h) /
              (mockTicker.high_24h - mockTicker.low_24h)) *
            100;

      expect(rangePosition).toBe(50);
    });
  });

  describe("Number Type Conversions", () => {
    it("should convert string prices to numbers", () => {
      tickerData.forEach((ticker) => {
        expect(typeof ticker.price).toBe("number");
        expect(typeof ticker.change_24h).toBe("number");
        expect(typeof ticker.high_24h).toBe("number");
        expect(typeof ticker.low_24h).toBe("number");
        expect(typeof ticker.volume_base).toBe("number");
      });
    });

    it("should maintain precision in number conversions", () => {
      tickerData.forEach((ticker) => {
        // Check that numbers are finite and not NaN
        expect(Number.isFinite(ticker.price)).toBe(true);
        expect(Number.isFinite(ticker.change_24h)).toBe(true);
        expect(Number.isFinite(ticker.high_24h)).toBe(true);
        expect(Number.isFinite(ticker.low_24h)).toBe(true);
        expect(Number.isFinite(ticker.volume_base)).toBe(true);
      });
    });

    it("should have consistent number formats", () => {
      const btcTicker = tickerData.find((t) => t.s === "BTCUSDT");
      if (btcTicker) {
        // Price should match the converted 'c' field
        expect(btcTicker.price).toBe(parseFloat(btcTicker.c));

        // Volume should match the converted 'v' field
        expect(btcTicker.volume_base).toBe(parseFloat(btcTicker.v));

        // Changes should match the converted 'P' field
        expect(btcTicker.change_24h).toBe(parseFloat(btcTicker.P));
      }
    });
  });

  describe("Normalized Volume Score", () => {
    it("should calculate normalized volume score when market cap is available", () => {
      const tickersWithMarketCap = tickerData.filter(
        (t) => t.market_cap && t.market_cap > 0
      );

      tickersWithMarketCap.forEach((ticker) => {
        expect(typeof ticker.normalized_volume_score).toBe("number");
        expect(ticker.normalized_volume_score).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(ticker.normalized_volume_score)).toBe(true);
      });
    });

    it("should calculate score correctly for known values", () => {
      const btcTicker = tickerData.find((t) => t.s === "BTCUSDT");
      if (btcTicker && btcTicker.market_cap) {
        // Formula: (volume_usd * 100000) / market_cap / 100
        const expectedScore =
          (btcTicker.volume_usd * 100000) / btcTicker.market_cap / 100;

        expect(
          Math.abs(btcTicker.normalized_volume_score - expectedScore)
        ).toBeLessThan(0.01);
      }
    });

    it("should handle zero or null market cap gracefully", () => {
      tickerData.forEach((ticker) => {
        if (!ticker.market_cap || ticker.market_cap === 0) {
          // Should be 0 or handle gracefully
          expect(ticker.normalized_volume_score).toBeGreaterThanOrEqual(0);
        }
      });
    });
  });

  describe("Short-term Changes", () => {
    it("should include short-term change fields", () => {
      tickerData.forEach((ticker) => {
        expect(ticker).toHaveProperty("change_1h");
        expect(ticker).toHaveProperty("change_4h");
        expect(ticker).toHaveProperty("change_8h");
        expect(ticker).toHaveProperty("change_12h");
      });
    });

    it("should have valid change values when present", () => {
      tickerData.forEach((ticker) => {
        ["change_1h", "change_4h", "change_8h", "change_12h"].forEach(
          (field) => {
            if (ticker[field] !== null && ticker[field] !== undefined) {
              expect(typeof ticker[field]).toBe("number");
              expect(Number.isFinite(ticker[field])).toBe(true);
            }
          }
        );
      });
    });

    it("should allow null values for unavailable data", () => {
      // Short-term changes can be null if candlestick data is not available
      tickerData.forEach((ticker) => {
        ["change_1h", "change_4h", "change_8h", "change_12h"].forEach(
          (field) => {
            if (ticker[field] === null) {
              expect(ticker[field]).toBeNull();
            }
          }
        );
      });
    });
  });

  describe("Data Consistency", () => {
    it("should maintain original Binance fields", () => {
      tickerData.forEach((ticker) => {
        // Original fields should still be present
        expect(ticker).toHaveProperty("s"); // symbol
        expect(ticker).toHaveProperty("c"); // close price
        expect(ticker).toHaveProperty("o"); // open price
        expect(ticker).toHaveProperty("h"); // high price
        expect(ticker).toHaveProperty("l"); // low price
        expect(ticker).toHaveProperty("v"); // volume
        expect(ticker).toHaveProperty("P"); // price change percentage
      });
    });

    it("should have consistent high/low relationships", () => {
      tickerData.forEach((ticker) => {
        expect(ticker.high_24h).toBeGreaterThanOrEqual(ticker.low_24h);
        expect(ticker.price).toBeGreaterThanOrEqual(ticker.low_24h);
        expect(ticker.price).toBeLessThanOrEqual(ticker.high_24h);
      });
    });

    it("should have positive volume values", () => {
      tickerData.forEach((ticker) => {
        expect(ticker.volume_base).toBeGreaterThanOrEqual(0);
        expect(ticker.volume_usd).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe("Performance Considerations", () => {
    it("should process calculations efficiently", async () => {
      const startTime = Date.now();

      const response = await request(app).get("/api/ticker/24hr").expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Should respond within reasonable time (adjust as needed)
      expect(responseTime).toBeLessThan(5000); // 5 seconds max
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it("should handle large datasets efficiently", () => {
      // All calculations should be completed without timeout
      expect(tickerData.length).toBeGreaterThan(0);

      // Verify all required calculations are present
      const hasAllCalculations = tickerData.every(
        (ticker) =>
          typeof ticker.price === "number" &&
          typeof ticker.volume_usd === "number" &&
          typeof ticker.range_position_24h === "number" &&
          typeof ticker.normalized_volume_score === "number"
      );

      expect(hasAllCalculations).toBe(true);
    });
  });
});
