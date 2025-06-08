/**
 * Ticker API routes configuration
 */
import express from "express";
import cors from "cors";
import TickerController from "../controllers/TickerController.js";
import MarketDataService from "../../services/MarketDataService.js";
import CandlestickRepository from "../../data/repositories/CandlestickRepository.js";
import DataSyncService from "../../services/DataSyncService.js";
import { getRateLimitingStatus } from "../../utils/rateLimiting.js";

interface TickerRoutesDependencies {
  marketDataService: typeof MarketDataService;
  candlestickRepository: typeof CandlestickRepository;
  dataSyncService: typeof DataSyncService;
  getRateLimitingStatusFunction: typeof getRateLimitingStatus;
}

/**
 * Creates and configures the ticker routes.
 * @param dependencies - Dependencies needed by the TickerController.
 * @returns The configured Express router for ticker API.
 */
export function createTickerRoutes(
  dependencies: TickerRoutesDependencies
): express.Router {
  const router = express.Router();
  const tickerController = new TickerController(dependencies);

  // Apply CORS middleware to all routes in this router
  router.use(cors());

  // Route definitions
  router.get("/", (req, res) => tickerController.getHealthCheck(req, res));
  router.get("/24hr", (req, res) =>
    tickerController.get24hrTickerData(req, res)
  );
  router.get("/candlestick/:symbol", (req, res) =>
    tickerController.getCandlestickDataBySymbol(req, res)
  );
  router.get("/candlestick", (req, res) =>
    tickerController.getCandlestickSummary(req, res)
  );
  router.get("/market-cap", (req, res) =>
    tickerController.getMarketCapData(req, res)
  ); // Renamed from /marketCap for consistency
  router.post("/market-data/refresh", (req, res) =>
    tickerController.refreshMarketData(req, res)
  ); // Changed to POST and more descriptive path

  return router;
}
