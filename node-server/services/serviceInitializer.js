/**
 * Service initialization for WebSocket and API services
 */

const { Console } = require("console");
const { initializeWebSockets } = require("./websocketService");
const { initializeCandlestickData } = require("./apiService");
const { HISTORICAL_DATA_INIT_DELAY } = require("../config/constants");

// Initialize logger
const logger = new Console({ stdout: process.stdout, stderr: process.stderr });

/**
 * Initialize all services
 */
function initializeServices() {
  // Validate environment variables
  const coingeckoApiKey = process.env.COINGECKO_API_KEY;
  if (!coingeckoApiKey) {
    logger.error("COINGECKO_API_KEY is not set in environment variables");
  }

  // Initialize WebSocket connections
  const webSocketClients = initializeWebSockets();

  // Initialize historical data after WebSocket connections are established
  setTimeout(initializeCandlestickData, HISTORICAL_DATA_INIT_DELAY);

  logger.info("All ticker services initialized successfully");

  return {
    webSocketClients,
  };
}

module.exports = {
  initializeServices,
};
