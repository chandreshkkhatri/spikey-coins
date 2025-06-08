/**
 * serviceInitializer.js
 * Initializes and wires up all services, repositories, and managers for the application.
 */
import logger from '../utils/logger.js';

// Data Layer
import CandlestickRepository from '../data/repositories/CandlestickRepository.js';
import TickerRepository from '../data/repositories/TickerRepository.js';

// External API Clients (not directly instantiated here if used as static classes, but listed for clarity)
// import BinanceClient from '../external/BinanceClient.js';
// import CoinGeckoClient from '../external/CoinGeckoClient.js';

// Business Logic Services
import PriceCalculationService from './PriceCalculationService.js';
import MarketDataService from './MarketDataService.js';
import DataSyncService from './DataSyncService.js';

// Realtime Components
import BinanceStreamManager from '../realtime/BinanceStreamManager.js';
import TickerStreamHandler from '../realtime/handlers/TickerStreamHandler.js';
import CandlestickStreamHandler from '../realtime/handlers/CandlestickStreamHandler.js';

// Utilities (if any need to be passed or instantiated, e.g., rate limiting status function)
import { getRateLimitingStatus } from '../utils/rateLimiting.js';

/**
 * Initializes all application services and returns them for the main app setup.
 * @returns {Promise<Object>} A promise that resolves to an object containing initialized services and managers.
 */
async function initializeAppServices() {
  logger.info('ServiceInitializer: Starting application service initialization...');

  // Instantiate Repositories (typically singletons, class with static methods used here)
  // No explicit instantiation needed if they are static classes like CandlestickRepository & TickerRepository

  // Instantiate Services
  const priceCalculationService = new PriceCalculationService({ candlestickRepository: CandlestickRepository });
  const marketDataService = new MarketDataService({
    tickerRepository: TickerRepository,
    priceCalculationService,
    // DataSyncService is used statically by MarketDataService for CoinGecko data, so not passed directly if not needed in constructor
  });
  // DataSyncService is a static class, no instantiation needed.

  // Instantiate Realtime Handlers
  const tickerStreamHandler = new TickerStreamHandler({ marketDataService, dataSyncService: DataSyncService });
  const candlestickStreamHandler = new CandlestickStreamHandler({ candlestickRepository: CandlestickRepository });

  // Instantiate Realtime Manager
  const binanceStreamManager = new BinanceStreamManager({
    tickerStreamHandler,
    candlestickStreamHandler,
    // other dependencies if any
  });

  // Perform initial data synchronization (candlesticks, CoinGecko initial fetch & schedule)
  // This is crucial and should happen before WebSocket connections that might rely on this data are fully active,
  // or designed to handle data arriving progressively.
  try {
    await DataSyncService.initializeHistoricalData();
  } catch (error) {
    logger.error('ServiceInitializer: Critical error during initial data synchronization:', error);
    // Depending on the severity, might want to prevent app startup or run in a degraded mode.
  }

  // Connect to Binance WebSocket streams
  // Ensure historical data is fetched or being fetched before this if handlers depend on it immediately.
  // The current DataSyncService.initializeHistoricalData includes an initial fetch.
  binanceStreamManager.connect();

  logger.info('ServiceInitializer: Application services initialized and WebSocket manager started.');

  // Return instances needed by the Express app (e.g., for controllers)
  return {
    marketDataService,
    candlestickRepository: CandlestickRepository, // Pass the static class itself or an instance if it were not static
    dataSyncService: DataSyncService,         // Pass the static class itself
    getRateLimitingStatusFunction: getRateLimitingStatus, // For TickerController
    // Expose other services/managers if needed by app.ts or other parts
  };
}

export default initializeAppServices;
