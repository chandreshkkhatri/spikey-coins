/**
 * Test suite for documentation endpoints
 * Tests Swagger UI and OpenAPI specification endpoints
 */

import request from "supertest";
import app from "./testApp";

describe("Documentation Endpoints", () => {
  describe("GET /docs", () => {
    it("should serve Swagger UI documentation", async () => {
      const response = await request(app).get("/docs/").expect(200);

      expect(response.text).toContain("swagger-ui");
      expect(response.headers["content-type"]).toMatch(/text\/html/);
    });

    it("should redirect /docs to /docs/", async () => {
      const response = await request(app).get("/docs").expect(301);

      expect(response.headers.location).toBe("/docs/");
    });
  });

  describe("GET /openapi.json", () => {
    it("should return valid OpenAPI specification", async () => {
      const response = await request(app).get("/openapi.json").expect(200);

      expect(response.headers["content-type"]).toMatch(/application\/json/);

      const spec = response.body;

      // Validate OpenAPI structure
      expect(spec).toHaveProperty("openapi");
      expect(spec).toHaveProperty("info");
      expect(spec).toHaveProperty("paths");
      expect(spec).toHaveProperty("components");

      // Validate OpenAPI version
      expect(spec.openapi).toMatch(/^3\./);

      // Validate info section
      expect(spec.info).toHaveProperty("title");
      expect(spec.info).toHaveProperty("version");
      expect(spec.info).toHaveProperty("description");

      // Validate paths
      expect(spec.paths).toHaveProperty("/api/ticker");
      expect(spec.paths).toHaveProperty("/api/ticker/24hr");
      expect(spec.paths).toHaveProperty("/api/ticker/candlestick");
      expect(spec.paths).toHaveProperty("/api/ticker/candlestick/{symbol}");
      expect(spec.paths).toHaveProperty("/api/ticker/marketCap");
    });

    it("should include proper API endpoint definitions", async () => {
      const response = await request(app).get("/openapi.json").expect(200);

      const spec = response.body;
      const paths = spec.paths;

      // Check that GET methods are defined for main endpoints
      expect(paths["/api/ticker/24hr"]).toHaveProperty("get");
      expect(paths["/api/ticker/candlestick"]).toHaveProperty("get");
      expect(paths["/api/ticker/candlestick/{symbol}"]).toHaveProperty("get");
      expect(paths["/api/ticker/marketCap"]).toHaveProperty("get");

      // Check response definitions
      const ticker24hrGet = paths["/api/ticker/24hr"].get;
      expect(ticker24hrGet).toHaveProperty("responses");
      expect(ticker24hrGet.responses).toHaveProperty("200");
    });

    it("should include proper component schemas", async () => {
      const response = await request(app).get("/openapi.json").expect(200);

      const spec = response.body;

      expect(spec.components).toHaveProperty("schemas");

      const schemas = spec.components.schemas;

      // Should include main data schemas
      expect(schemas).toHaveProperty("TickerResponse");
      expect(schemas).toHaveProperty("TickerData");
      expect(schemas).toHaveProperty("CandlestickResponse");
      expect(schemas).toHaveProperty("MarketCapResponse");
      expect(schemas).toHaveProperty("ErrorResponse");
    });

    it("should include proper parameter definitions", async () => {
      const response = await request(app).get("/openapi.json").expect(200);

      const spec = response.body;
      const symbolPath = spec.paths["/api/ticker/candlestick/{symbol}"];

      expect(symbolPath.get).toHaveProperty("parameters");

      const parameters = symbolPath.get.parameters;
      expect(parameters).toBeInstanceOf(Array);
      expect(parameters.length).toBeGreaterThan(0);

      const symbolParam = parameters.find((p: any) => p.name === "symbol");
      expect(symbolParam).toBeDefined();
      expect(symbolParam.in).toBe("path");
      expect(symbolParam.required).toBe(true);
    });
  });

  describe("Documentation Content Validation", () => {
    it("should have comprehensive API documentation", async () => {
      const response = await request(app).get("/openapi.json").expect(200);

      const spec = response.body;

      // Check that documentation includes descriptions
      expect(spec.info.description).toBeTruthy();
      expect(spec.info.title).toBeTruthy();
      expect(spec.info.version).toBeTruthy();

      // Check that endpoints have descriptions
      const paths = spec.paths;
      Object.keys(paths).forEach((pathKey) => {
        const path = paths[pathKey];
        Object.keys(path).forEach((method) => {
          if (method !== "parameters") {
            const operation = path[method];
            expect(operation).toHaveProperty("summary");
            expect(operation).toHaveProperty("description");
            expect(operation.summary).toBeTruthy();
          }
        });
      });
    });

    it("should include proper response examples", async () => {
      const response = await request(app).get("/openapi.json").expect(200);

      const spec = response.body;
      const ticker24hrPath = spec.paths["/api/ticker/24hr"];

      expect(ticker24hrPath.get.responses["200"]).toHaveProperty("content");

      const content = ticker24hrPath.get.responses["200"].content;
      expect(content).toHaveProperty("application/json");

      const jsonContent = content["application/json"];
      expect(jsonContent).toHaveProperty("schema");
    });

    it("should include error response documentation", async () => {
      const response = await request(app).get("/openapi.json").expect(200);

      const spec = response.body;
      const candlestickSymbolPath =
        spec.paths["/api/ticker/candlestick/{symbol}"];

      expect(candlestickSymbolPath.get.responses).toHaveProperty("404");

      const errorResponse = candlestickSymbolPath.get.responses["404"];
      expect(errorResponse).toHaveProperty("description");
      expect(errorResponse).toHaveProperty("content");
      expect(errorResponse.content).toHaveProperty("application/json");
    });
  });

  describe("Documentation Accessibility", () => {
    it("should serve Swagger UI assets correctly", async () => {
      const response = await request(app).get("/docs/").expect(200);

      // Should contain Swagger UI initialization
      expect(response.text).toContain("SwaggerUIBundle");
      expect(response.text).toContain("swagger-ui");

      // Should reference the OpenAPI spec
      expect(response.text).toContain("/openapi.json");
    });

    it("should handle documentation requests with different user agents", async () => {
      const userAgents = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "curl/7.68.0",
      ];

      for (const userAgent of userAgents) {
        const response = await request(app)
          .get("/docs/")
          .set("User-Agent", userAgent)
          .expect(200);

        expect(response.text).toContain("swagger-ui");
      }
    });
  });

  describe("OpenAPI Specification Validation", () => {
    it("should conform to OpenAPI 3.0 specification", async () => {
      const response = await request(app).get("/openapi.json").expect(200);

      const spec = response.body;

      // Basic OpenAPI 3.0 structure validation
      expect(spec.openapi).toMatch(/^3\.[0-9]+\.[0-9]+$/);
      expect(spec).toHaveProperty("info");
      expect(spec).toHaveProperty("paths");

      // Info object validation
      expect(spec.info).toHaveProperty("title");
      expect(spec.info).toHaveProperty("version");
      expect(typeof spec.info.title).toBe("string");
      expect(typeof spec.info.version).toBe("string");

      // Paths object validation
      expect(typeof spec.paths).toBe("object");
      expect(Object.keys(spec.paths).length).toBeGreaterThan(0);
    });

    it("should include all documented endpoints in paths", async () => {
      const response = await request(app).get("/openapi.json").expect(200);

      const spec = response.body;
      const paths = spec.paths;

      // Required paths should be present
      const requiredPaths = [
        "/api/ticker",
        "/api/ticker/24hr",
        "/api/ticker/candlestick",
        "/api/ticker/candlestick/{symbol}",
        "/api/ticker/marketCap",
      ];

      requiredPaths.forEach((path) => {
        expect(paths).toHaveProperty(path);
      });
    });

    it("should have consistent schema references", async () => {
      const response = await request(app).get("/openapi.json").expect(200);

      const spec = response.body;

      // Check that schema references are valid
      const paths = spec.paths;
      const schemas = spec.components?.schemas || {};

      // Find all $ref in the spec
      const refs: string[] = [];
      const findRefs = (obj: any) => {
        if (typeof obj === "object" && obj !== null) {
          if (obj.$ref && typeof obj.$ref === "string") {
            refs.push(obj.$ref);
          }
          Object.values(obj).forEach(findRefs);
        }
      };

      findRefs(paths);

      // All refs should point to existing schemas
      refs.forEach((ref) => {
        if (ref.startsWith("#/components/schemas/")) {
          const schemaName = ref.replace("#/components/schemas/", "");
          expect(schemas).toHaveProperty(schemaName);
        }
      });
    });
  });

  describe("Integration with API Endpoints", () => {
    it("should document endpoints that actually exist", async () => {
      const specResponse = await request(app).get("/openapi.json").expect(200);
      const spec = specResponse.body;
      const documentedPaths = Object.keys(spec.paths);

      // Test that documented endpoints actually work
      for (const path of documentedPaths) {
        if (path.includes("{symbol}")) {
          // Test with a valid symbol
          const testPath = path.replace("{symbol}", "BTCUSDT");
          const response = await request(app).get(testPath);
          // Should either work (200) or return proper error (404)
          expect([200, 404]).toContain(response.status);
        } else {
          const response = await request(app).get(path);
          expect(response.status).toBe(200);
        }
      }
    });

    it("should match response schemas with actual API responses", async () => {
      const specResponse = await request(app).get("/openapi.json").expect(200);
      const spec = specResponse.body;

      // Get actual API response
      const apiResponse = await request(app)
        .get("/api/ticker/24hr")
        .expect(200);

      // The actual response should match the documented structure
      expect(apiResponse.body).toHaveProperty("success");
      expect(apiResponse.body).toHaveProperty("data");
      expect(apiResponse.body).toHaveProperty("count");
      expect(apiResponse.body).toHaveProperty("timestamp");

      // Success should be boolean, data should be array
      expect(typeof apiResponse.body.success).toBe("boolean");
      expect(Array.isArray(apiResponse.body.data)).toBe(true);
      expect(typeof apiResponse.body.count).toBe("number");
      expect(typeof apiResponse.body.timestamp).toBe("string");
    });
  });
});
