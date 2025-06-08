import express from 'express';
import cors from 'cors';
import TickerController from '../controllers/TickerController.js';

/**
 * Creates and configures the ticker routes.
 * @param {Object} dependencies - Dependencies needed by the TickerController.
 * @param {import('../../services/MarketDataService.js').default} dependencies.marketDataService
 * @param {import('../../data/repositories/CandlestickRepository.js').default} dependencies.candlestickRepository
 * @param {import('../../services/DataSyncService.js').default} dependencies.dataSyncService
 * @param {import('../../utils/rateLimiting.js').getRateLimitingStatus} dependencies.getRateLimitingStatusFunction
 * @returns {express.Router} The configured Express router for ticker API.
 */
export function createTickerRoutes(dependencies) {
  const router = express.Router();
  const tickerController = new TickerController(dependencies);

  // Apply CORS middleware to all routes in this router
  router.use(cors());

  // Route definitions
  router.get('/', (req, res) => tickerController.getHealthCheck(req, res));
  router.get('/24hr', (req, res) => tickerController.get24hrTickerData(req, res));
  router.get('/candlestick/:symbol', (req, res) => tickerController.getCandlestickDataBySymbol(req, res));
  router.get('/candlestick', (req, res) => tickerController.getCandlestickSummary(req, res));
  router.get('/market-cap', (req, res) => tickerController.getMarketCapData(req, res)); // Renamed from /marketCap for consistency
  router.post('/market-data/refresh', (req, res) => tickerController.refreshMarketData(req, res)); // Changed to POST and more descriptive path

  return router;
}
