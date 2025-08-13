/**
 * Spikey Coins Crypto Data Server
 * Real-time cryptocurrency data proxy with WebSocket streams
 */
import express from "express";
import cors from "cors";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import { join } from "path";
import logger from "./src/utils/logger.js";
import BinanceClient from "./src/core/BinanceClient.js";
import CandlestickStorage from "./src/services/CandlestickStorage.js";
import * as routes from "./src/routes/routes.js";

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json());
// Use 'common' instead of 'combined' for less verbose HTTP logging
// Only log HTTP requests at info level or higher (not debug)
app.use(morgan('common', { 
  stream: { 
    write: (message: string) => logger.info(message.trim()) 
  },
  skip: (req, res) => {
    // Skip logging for health check endpoints to reduce log noise
    return req.url === '/' || req.url === '/api/ticker'
  }
}));

// Initialize Binance client
const binanceClient = new BinanceClient();
routes.setBinanceClient(binanceClient);

// API Documentation
try {
  const swaggerDocument = YAML.load(join(process.cwd(), 'openapi.yaml'));
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Spikey Coins API Documentation',
  }));
  app.get('/openapi.json', (req, res) => {
    res.json(swaggerDocument);
  });
} catch (error) {
  logger.warn('Could not load OpenAPI documentation:', error);
}

// Routes
app.get('/', routes.healthCheck);
app.get('/api/ticker', routes.tickerHealth);
app.get('/api/ticker/24hr', routes.get24hrTicker);
app.get('/api/ticker/symbol/:symbol', routes.getTickerBySymbol);
app.get('/api/ticker/candlestick', routes.getCandlestickSummary);
app.get('/api/ticker/candlestick/:symbol', routes.getCandlestickData);
app.get('/api/ticker/storage-stats', routes.getStorageStats);
app.get('/api/ticker/discovery-stats', routes.getDiscoveryStats);
app.get('/api/ticker/candlestick-storage-stats', routes.getCandlestickStorageStats);
app.get('/api/ticker/marketCap', routes.getMarketCapData);
app.get('/api/ticker/refreshMarketcapData', routes.refreshMarketCapData);

// Global error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    availableEndpoints: [
      'GET /',
      'GET /api/ticker',
      'GET /api/ticker/24hr',
      'GET /api/ticker/symbol/:symbol',
      'GET /api/ticker/candlestick',
      'GET /api/ticker/candlestick/:symbol',
      'GET /api/ticker/storage-stats',
      'GET /api/ticker/discovery-stats',
      'GET /api/ticker/marketCap',
      'GET /api/ticker/refreshMarketcapData',
      'GET /docs',
    ],
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  binanceClient.cleanup();
  CandlestickStorage.cleanup();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  binanceClient.cleanup();
  CandlestickStorage.cleanup();
  process.exit(0);
});

// Start server
async function startServer() {
  try {
    // Start Binance WebSocket connections
    await binanceClient.start();
    
    // Start Express server
    app.listen(PORT, () => {
      logger.info(`✅ Spikey Coins Server running on port ${PORT}`);
      logger.info(`📊 API Documentation: http://localhost:${PORT}/docs`);
      logger.info(`🔄 Health Check: http://localhost:${PORT}/`);
      logger.info(`📈 Ticker Data: http://localhost:${PORT}/api/ticker/24hr`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  binanceClient.cleanup();
  CandlestickStorage.cleanup();
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason);
  binanceClient.cleanup();
  CandlestickStorage.cleanup();
  process.exit(1);
});

startServer();