import express, { Application, Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import logger from "./src/utils/logger.js"; // Updated path
import morgan from "morgan";

// Import clients and services
import BinanceClient from "./src/external/BinanceClient.js";

// Repositories (instantiated, hold state)
import CandlestickRepository from "./src/data/repositories/CandlestickRepository.js";
import TickerRepository from "./src/data/repositories/TickerRepository.js";

// Services (currently designed with static methods, not instantiated)
import MarketDataService from "./src/services/MarketDataService.js";
import DataSyncService from "./src/services/DataSyncService.js";

// Realtime components for ticker streaming only
import BinanceTickerManager from "./src/realtime/BinanceTickerManager.js";
import TickerStreamHandler from "./src/realtime/handlers/TickerStreamHandler.js";

import { getRateLimitingStatus } from "./src/utils/rateLimiting.js";

// Import the new router factory function
import { createTickerRoutes } from "./src/api/routes/tickerRoutes.js";

// Load environment variables
dotenv.config();

// Load OpenAPI specification
const swaggerDocument = YAML.load("./openapi.yaml");

// Configuration
const PORT: number = parseInt(process.env.PORT || "8000", 10);
const app: Application = express();

// Instantiate stream handlers with their dependencies
const tickerStreamHandler = new TickerStreamHandler({
  marketDataService: MarketDataService, // Pass the class/module itself for static access
});

const binanceTickerManager = new BinanceTickerManager({
  tickerStreamHandler,
  // Removed candlestick streaming
});

// Initialize services: fetch initial data and start WebSocket streams
async function initializeAppServices() {
  try {
    logger.info("Initializing application services...");

    // Connect WebSocket streams FIRST to allow for symbol discovery
    logger.info("Connecting to Binance WebSocket streams...");
    binanceTickerManager.connect();
    logger.info("Binance WebSocket stream connection process initiated.");

    // Now, initialize historical data. This will wait for symbols if needed.
    await DataSyncService.initializeHistoricalData();
    logger.info("Historical data initialization process complete.");

    logger.info("✅ Application services initialization sequence complete.");
  } catch (error) {
    logger.error("❌ Failed to initialize application services:", error);
    // Depending on the severity, you might want to exit the process
    // process.exit(1);
  }
}

// Middleware
app.use(cors());
app.use(express.json());

// Use morgan for HTTP request logging, piped through Winston
app.use(
  morgan("combined", {
    stream: { write: (message: string) => logger.info(message.trim()) },
  })
);

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
app.get("/openapi.json", (req: Request, res: Response) => {
  res.json(swaggerDocument);
});

// Create and use the new ticker routes
// TickerController now uses static methods directly, no dependency injection needed
const tickerRoutes = createTickerRoutes();
app.use("/api/ticker", tickerRoutes);

// Health check endpoint
app.get("/", (req: Request, res: Response) => {
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
app.listen(PORT, async () => {
  // Make the callback async
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(
    `📚 API documentation available at http://localhost:${PORT}/docs`
  );
  logger.info(
    `📄 OpenAPI specification available at http://localhost:${PORT}/openapi.json`
  );
  await initializeAppServices(); // Initialize services after server starts listening
});
