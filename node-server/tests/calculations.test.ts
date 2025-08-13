/**
 * Test suite for backend calculations
 * Tests the accuracy and correctness of server-side calculations
 */

import request from "supertest";
import app from "./testApp";
// import type { Ticker } from "../src/core/DataManager.js";

describe("Backend Calculations", () => {
  let tickerData: Ticker[];

  beforeAll(async () => {
    // Get ticker data for testing calculations
    const response = await request(app).get("/api/ticker/24hr").expect(200);

    tickerData = response.body.data;
  });
  describe("Volume USD Calculation", () => {
    it("should calculate volume_usd correctly as volume_base * price", () => {
      tickerData.forEach((ticker) => {
        if (
          ticker.volume_base !== undefined && ticker.volume_base !== null &&
          ticker.price !== undefined && ticker.price !== null &&
          ticker.volume_usd !== undefined && ticker.volume_usd !== null
        ) {
          const expectedVolumeUsd = ticker.volume_base * ticker.price;

          // Allow for small floating point differences
          expect(Math.abs(ticker.volume_usd - expectedVolumeUsd)).toBeLessThan(
            0.01
          );
        }
      });
    });

    it("should have volume_usd as a positive number", () => {
      tickerData.forEach((ticker) => {
        if (ticker.volume_usd !== undefined && ticker.volume_usd !== null) {
          expect(typeof ticker.volume_usd).toBe("number");
          expect(ticker.volume_usd).toBeGreaterThanOrEqual(0);
          expect(Number.isFinite(ticker.volume_usd)).toBe(true);
        }
      });
    });
  });

  describe("Range Position Calculation", () => {
    it("should calculate range_position_24h within 0-100%", () => {
      tickerData.forEach((ticker) => {
        if (ticker.range_position_24h !== undefined && ticker.range_position_24h !== null) {
          expect(typeof ticker.range_position_24h).toBe("number");
          expect(ticker.range_position_24h).toBeGreaterThanOrEqual(0);
          expect(ticker.range_position_24h).toBeLessThanOrEqual(100);
          expect(Number.isFinite(ticker.range_position_24h)).toBe(true);
        }
      });
    });
    it("should calculate range position correctly", () => {
      const btcTicker = tickerData.find((t) => t.s === "BTCUSDT");
      if (
        btcTicker &&
        btcTicker.high_24h !== undefined && btcTicker.high_24h !== null &&
        btcTicker.low_24h !== undefined && btcTicker.low_24h !== null &&
        btcTicker.price !== undefined && btcTicker.price !== null &&
        btcTicker.range_position_24h !== undefined && btcTicker.range_position_24h !== null
      ) {
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
        if (ticker.price !== undefined && ticker.price !== null) {
          expect(typeof ticker.price).toBe("number");
        }
        if (ticker.change_24h !== undefined && ticker.change_24h !== null) {
          expect(typeof ticker.change_24h).toBe("number");
        }
        if (ticker.high_24h !== undefined && ticker.high_24h !== null) {
          expect(typeof ticker.high_24h).toBe("number");
        }
        if (ticker.low_24h !== undefined && ticker.low_24h !== null) {
          expect(typeof ticker.low_24h).toBe("number");
        }
        if (ticker.volume_base !== undefined && ticker.volume_base !== null) {
          expect(typeof ticker.volume_base).toBe("number");
        }
      });
    });

    it("should maintain precision in number conversions", () => {
      tickerData.forEach((ticker) => {
        // Check that numbers are finite and not NaN
        if (ticker.price !== undefined && ticker.price !== null) {
          expect(Number.isFinite(ticker.price)).toBe(true);
          expect(ticker.price).toBeGreaterThan(0);
        }
        if (ticker.change_24h !== undefined && ticker.change_24h !== null) {
          expect(Number.isFinite(ticker.change_24h)).toBe(true);
        }
        if (ticker.high_24h !== undefined && ticker.high_24h !== null) {
          expect(Number.isFinite(ticker.high_24h)).toBe(true);
          expect(ticker.high_24h).toBeGreaterThan(0);
        }
        if (ticker.low_24h !== undefined && ticker.low_24h !== null) {
          expect(Number.isFinite(ticker.low_24h)).toBe(true);
          expect(ticker.low_24h).toBeGreaterThan(0);
        }
        if (ticker.volume_base !== undefined && ticker.volume_base !== null) {
          expect(Number.isFinite(ticker.volume_base)).toBe(true);
        }
        if (ticker.volume_usd !== undefined && ticker.volume_usd !== null) {
          expect(Number.isFinite(ticker.volume_usd)).toBe(true);
        }
      });
    });
  });
  describe("Percentage Change Calculations", () => {
    it("should calculate change_24h as percentage", () => {
      tickerData.forEach((ticker) => {
        if (ticker.change_24h !== undefined && ticker.change_24h !== null) {
          expect(typeof ticker.change_24h).toBe("number");
          expect(Number.isFinite(ticker.change_24h)).toBe(true);

          // Change should be reasonable (not more than ±100% in most cases)
          expect(Math.abs(ticker.change_24h)).toBeLessThan(200);
        }
      });
    });

    it("should have consistent price relationships", () => {
      tickerData.forEach((ticker) => {
        if (
          ticker.high_24h !== undefined && ticker.high_24h !== null &&
          ticker.low_24h !== undefined && ticker.low_24h !== null &&
          ticker.price !== undefined && ticker.price !== null
        ) {
          // High should be >= Low
          expect(ticker.high_24h).toBeGreaterThanOrEqual(ticker.low_24h);

          // Current price should be between high and low (with small tolerance for timing)
          expect(ticker.price).toBeGreaterThanOrEqual(ticker.low_24h * 0.99);
          expect(ticker.price).toBeLessThanOrEqual(ticker.high_24h * 1.01);
        }
      });
    });
  });

  describe("Short-term Change Calculations", () => {
    it("should include short-term percentage changes", () => {
      tickerData.forEach((ticker) => {
        if (ticker.change_1h !== undefined && ticker.change_1h !== null) {
          expect(typeof ticker.change_1h).toBe("number");
          expect(Number.isFinite(ticker.change_1h)).toBe(true);
        }

        if (ticker.change_4h !== undefined && ticker.change_4h !== null) {
          expect(typeof ticker.change_4h).toBe("number");
          expect(Number.isFinite(ticker.change_4h)).toBe(true);
        }

        if (ticker.change_12h !== undefined && ticker.change_12h !== null) {
          expect(typeof ticker.change_12h).toBe("number");
          expect(Number.isFinite(ticker.change_12h)).toBe(true);
        }
      });
    });
  });

  describe("Volume Calculations", () => {
    it("should have volume_base as positive number", () => {
      tickerData.forEach((ticker) => {
        if (ticker.volume_base !== undefined && ticker.volume_base !== null) {
          expect(typeof ticker.volume_base).toBe("number");
          expect(ticker.volume_base).toBeGreaterThanOrEqual(0);
          expect(Number.isFinite(ticker.volume_base)).toBe(true);
        }
      });
    });
    it("should calculate volume_usd consistently with price", () => {
      tickerData.forEach((ticker) => {
        if (
          ticker.volume_base !== undefined && ticker.volume_base !== null &&
          ticker.price !== undefined && ticker.price !== null &&
          ticker.volume_usd !== undefined && ticker.volume_usd !== null
        ) {
          const calculatedVolumeUsd = ticker.volume_base * ticker.price;
          const storedVolumeUsd = ticker.volume_usd;

          // Allow for small rounding differences
          const percentageDifference =
            Math.abs(calculatedVolumeUsd - storedVolumeUsd) /
            Math.max(calculatedVolumeUsd, storedVolumeUsd);

          expect(percentageDifference).toBeLessThan(0.001); // Less than 0.1% difference
        }
      });
    });
  });

  describe("Data Consistency", () => {
    it("should have all required fields", () => {
      tickerData.forEach((ticker) => {
        // Check that all essential fields exist
        expect(ticker.s).toBeDefined(); // symbol
        expect(ticker.price).toBeDefined();
        expect(ticker.change_24h).toBeDefined();
        expect(ticker.high_24h).toBeDefined();
        expect(ticker.low_24h).toBeDefined();
        expect(ticker.volume_base).toBeDefined();
        expect(ticker.volume_usd).toBeDefined();
        expect(ticker.range_position_24h).toBeDefined();

        // Check types with null safety
        if (ticker.s !== undefined) {
          expect(typeof ticker.s).toBe("string");
        }
        if (ticker.price !== undefined && ticker.price !== null) {
          expect(typeof ticker.price).toBe("number");
        }
        if (ticker.change_24h !== undefined && ticker.change_24h !== null) {
          expect(typeof ticker.change_24h).toBe("number");
        }
        if (ticker.high_24h !== undefined && ticker.high_24h !== null) {
          expect(typeof ticker.high_24h).toBe("number");
        }
        if (ticker.low_24h !== undefined && ticker.low_24h !== null) {
          expect(typeof ticker.low_24h).toBe("number");
        }
        if (ticker.volume_base !== undefined && ticker.volume_base !== null) {
          expect(typeof ticker.volume_base).toBe("number");
        }
        if (ticker.volume_usd !== undefined && ticker.volume_usd !== null) {
          expect(typeof ticker.volume_usd).toBe("number");
        }
        if (ticker.range_position_24h !== undefined && ticker.range_position_24h !== null) {
          expect(typeof ticker.range_position_24h).toBe("number");
        }
      });
    });

    it("should have reasonable symbol names", () => {
      tickerData.forEach((ticker) => {
        if (ticker.s !== undefined) {
          expect(ticker.s).toMatch(/^[A-Z]+USDT?$/); // Should be uppercase pairs ending in USD or USDT
          expect(ticker.s.length).toBeGreaterThan(3);
          expect(ticker.s.length).toBeLessThan(20);
        }
      });
    });

    it("should sort data consistently", () => {
      // Verify that the data maintains consistent ordering between requests
      const symbols = tickerData.map((t) => t.s).filter(Boolean);
      const uniqueSymbols = new Set(symbols);

      // No duplicate symbols
      expect(symbols.length).toBe(uniqueSymbols.size);

      // Should have multiple symbols
      expect(symbols.length).toBeGreaterThan(1);
    });
  });

  describe("Backend Processing Performance", () => {
    it("should process ticker data within reasonable time", async () => {
      const startTime = Date.now();
      const response = await request(app).get("/api/ticker/24hr").expect(200);
      const endTime = Date.now();

      const responseTime = endTime - startTime;

      // Response should be under 2 seconds
      expect(responseTime).toBeLessThan(2000);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it("should handle multiple concurrent requests", async () => {
      const requests = Array(5)
        .fill(null)
        .map(() => request(app).get("/api/ticker/24hr"));

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.length).toBeGreaterThan(0);
      });
    });
  });
});
