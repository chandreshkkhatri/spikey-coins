/**
 * Ticker API routes configuration
 */
import express from "express";
import cors from "cors";
import TickerController from "../controllers/TickerController.js";

/**
 * Creates and configures the ticker routes.
 * @returns The configured Express router for ticker API.
 */
export function createTickerRoutes(): express.Router {
  const router = express.Router();
  const tickerController = new TickerController();

  // Apply CORS middleware to all routes in this router
  router.use(cors());

  // Route definitions
  router.get("/", (req, res) => tickerController.getHealthCheck(req, res));
  router.get("/24hr", (req, res) =>
    tickerController.get24hrTicker(req, res)
  );
  router.get("/symbol/:symbol", (req, res) =>
    tickerController.getTickerBySymbol(req, res)
  );
  router.get("/candlestick/:symbol", (req, res) =>
    tickerController.getCandlestickDataBySymbol(req, res)
  );
  router.get("/candlestick", (req, res) =>
    tickerController.getCandlestickSummary(req, res)
  );
  router.get("/storage-stats", async (req, res) =>
    await tickerController.getStorageStats(req, res)
  );
  router.get("/discovery-stats", (req, res) =>
    tickerController.getDiscoveryStats(req, res)
  );

  return router;
}
