/**
 * Test suite for documentation endpoints
 * Tests Swagger UI and OpenAPI specification endpoints
 */

const request = require("supertest");
const app = require("./testApp");

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

      // Validate components
      expect(spec.components).toHaveProperty("schemas");
      expect(spec.components.schemas).toHaveProperty("TickerData");
      expect(spec.components.schemas).toHaveProperty("CandlestickData");
    });

    it("should include proper endpoint definitions", async () => {
      const response = await request(app).get("/openapi.json").expect(200);

      const spec = response.body;

      // Check specific endpoint
      const tickerEndpoint = spec.paths["/api/ticker/24hr"];
      expect(tickerEndpoint).toHaveProperty("get");
      expect(tickerEndpoint.get).toHaveProperty("summary");
      expect(tickerEndpoint.get).toHaveProperty("responses");
      expect(tickerEndpoint.get.responses).toHaveProperty("200");
    });

    it("should include proper schema definitions", async () => {
      const response = await request(app).get("/openapi.json").expect(200);

      const spec = response.body;
      const tickerSchema = spec.components.schemas.TickerData;

      // Validate TickerData schema
      expect(tickerSchema).toHaveProperty("type", "object");
      expect(tickerSchema).toHaveProperty("properties");

      const props = tickerSchema.properties;

      // Check for backend-calculated fields
      expect(props).toHaveProperty("price");
      expect(props).toHaveProperty("change_24h");
      expect(props).toHaveProperty("volume_usd");
      expect(props).toHaveProperty("range_position_24h");
      expect(props).toHaveProperty("normalized_volume_score");

      // Validate field types
      expect(props.price.type).toBe("number");
      expect(props.volume_usd.type).toBe("number");
      expect(props.range_position_24h.type).toBe("number");
    });
  });

  describe("Swagger UI Assets", () => {
    it("should serve swagger-ui CSS", async () => {
      const response = await request(app)
        .get("/docs/swagger-ui-bundle.js")
        .expect(200);

      expect(response.headers["content-type"]).toMatch(
        /application\/javascript/
      );
    });

    it("should serve swagger-ui JS", async () => {
      const response = await request(app)
        .get("/docs/swagger-ui.css")
        .expect(200);

      expect(response.headers["content-type"]).toMatch(/text\/css/);
    });
  });

  describe("Documentation Content Validation", () => {
    it("should have comprehensive endpoint documentation", async () => {
      const response = await request(app).get("/openapi.json").expect(200);

      const spec = response.body;
      const pathCount = Object.keys(spec.paths).length;

      // Should have all major endpoints documented
      expect(pathCount).toBeGreaterThanOrEqual(6);
    });

    it("should include proper response examples", async () => {
      const response = await request(app).get("/openapi.json").expect(200);

      const spec = response.body;
      const tickerResponse =
        spec.paths["/api/ticker/24hr"].get.responses["200"];

      expect(tickerResponse).toHaveProperty("description");
      expect(tickerResponse).toHaveProperty("content");
      expect(tickerResponse.content).toHaveProperty("application/json");
    });

    it("should include error response documentation", async () => {
      const response = await request(app).get("/openapi.json").expect(200);

      const spec = response.body;

      // Check for error schemas
      expect(spec.components.schemas).toHaveProperty("ErrorResponse");

      // Check endpoints have error responses
      const candlestickEndpoint =
        spec.paths["/api/ticker/candlestick/{symbol}"];
      expect(candlestickEndpoint.get.responses).toHaveProperty("404");
      expect(candlestickEndpoint.get.responses).toHaveProperty("500");
    });
  });
});
