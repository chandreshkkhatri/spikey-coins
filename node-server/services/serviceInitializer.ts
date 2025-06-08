/**
 * Service initialization for WebSocket and API services
 */

import { Console } from "console";
import { initializeWebSockets } from "./websocketService";
import { initializeCandlestickData } from "./apiService";
import { HISTORICAL_DATA_INIT_DELAY } from "../config/constants";

// Initialize logger
const logger = new Console({ stdout: process.stdout, stderr: process.stderr });

// Interface for service initialization return value
interface ServiceInitializationResult {
  webSocketClients: {
    tickerWebsocketClient: any;
    candlestickWebsocketClient: any;
  };
}

/**
 * Initialize all services
 */
export function initializeServices(): ServiceInitializationResult {
  // Validate environment variables
  const coingeckoApiKey: string | undefined = process.env.COINGECKO_API_KEY;
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
