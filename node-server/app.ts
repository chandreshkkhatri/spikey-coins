import express, { Application, Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import logger from "./src/utils/logger.js"; // Updated path
import morgan from "morgan";

// Import new service and repository classes
// Clients (can be used statically or instantiated if they held state)
import BinanceClient from "./src/external/BinanceClient.js";
import CoinGeckoClient from "./src/external/CoinGeckoClient.js";

// Repositories (instantiated, hold state)
import CandlestickRepository from "./src/data/repositories/CandlestickRepository.js";
import TickerRepository from "./src/data/repositories/TickerRepository.js";

// Services (currently designed with static methods, not instantiated)
import PriceCalculationService from "./src/services/PriceCalculationService.js";
import MarketDataService from "./src/services/MarketDataService.js";
import DataSyncService from "./src/services/DataSyncService.js";

// Realtime components (instantiated)
import BinanceStreamManager from "./src/realtime/BinanceStreamManager.js";
import TickerStreamHandler from "./src/realtime/handlers/TickerStreamHandler.js";
import CandlestickStreamHandler from "./src/realtime/handlers/CandlestickStreamHandler.js";

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

// All services are used statically (CandlestickRepository, TickerRepository,
// MarketDataService, DataSyncService, PriceCalculationService)

// Instantiate stream handlers with their dependencies
// Note: MarketDataService and DataSyncService are passed as classes/modules for their static methods
// or specific instances if they were refactored.
// For PriceCalculationService, its static methods are used directly by MarketDataService.
const tickerStreamHandler = new TickerStreamHandler({
  marketDataService: MarketDataService, // Pass the class/module itself for static access
  dataSyncService: DataSyncService, // Pass the class/module itself for static access
});
const candlestickStreamHandler = new CandlestickStreamHandler({
  candlestickRepository: CandlestickRepository,
});

const binanceStreamManager = new BinanceStreamManager({
  tickerStreamHandler,
  candlestickStreamHandler,
  // candlestickRepository and other direct dependencies for BinanceStreamManager if it needed them
});

// Initialize services: fetch initial data and start WebSocket streams
async function initializeAppServices() {
  try {
    logger.info("Initializing application services...");
    // Call static method on DataSyncService
    await DataSyncService.initializeHistoricalData();
    logger.info("Historical data initialization process initiated.");

    // Connect WebSocket streams
    binanceStreamManager.connect(); // This method is on the instance
    logger.info("Binance WebSocket streams initiated.");

    logger.info("Application services initialization sequence complete.");
  } catch (error) {
    logger.error("Failed to initialize application services:", error);
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
// TickerController expects instances or direct access to static methods.
// Adjusting dependencies for TickerController based on static/instance nature of services.
const tickerRoutes = createTickerRoutes({
  marketDataService: MarketDataService, // Pass class for static methods
  candlestickRepository: CandlestickRepository, // Pass class for static methods
  dataSyncService: DataSyncService, // Pass class for static methods
  getRateLimitingStatusFunction: getRateLimitingStatus,
});
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
