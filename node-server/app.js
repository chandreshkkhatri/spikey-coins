const express = require("express");
const cors = require("cors");
require("dotenv").config();
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const logger = require("./helpers/logger"); // Import the logger
const morgan = require("morgan"); // Import morgan

// Load OpenAPI specification
const swaggerDocument = YAML.load("./openapi.yaml");

// Configuration
const PORT = process.env.PORT || 8000;
const app = express();

// Import routers
const tickerRouter = require("./routers/ticker-router");

// Middleware
app.use(cors());
app.use(express.json());

// Use morgan for HTTP request logging, piped through Winston
app.use(morgan("combined", { stream: logger.stream }));

// API Documentation
app.use(
  "/docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument, {
    customSiteTitle: "Spikey Coins API Documentation",
    customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info .title { color: #3b82f6 }
  `,
    customCssUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css",
  })
);

// Serve OpenAPI spec as JSON
app.get("/openapi.json", (req, res) => {
  res.json(swaggerDocument);
});

// Routes
app.use("/api/ticker", tickerRouter);

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Spikey Coins Proxy Server",
    description: "Tunneling requests to bypass CORS issues",
    status: "healthy",
    timestamp: new Date().toISOString(),
    documentation: {
      swaggerUI: `http://localhost:${PORT}/docs`,
      openAPISpec: `http://localhost:${PORT}/openapi.json`,
    },
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(
    `📚 API documentation available at http://localhost:${PORT}/docs`
  );
  logger.info(
    `📄 OpenAPI specification available at http://localhost:${PORT}/openapi.json`
  );
});
