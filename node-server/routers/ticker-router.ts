/**
 * Refactored ticker router using modular architecture
 * This file now serves as the main entry point that orchestrates all the modules
 */

import express, { Router } from "express";
import tickerRoutes from "../routes/tickerRoutes";
import { initializeServices } from "../services/serviceInitializer";

// Initialize all services (WebSocket connections, API clients, etc.)
initializeServices();

// Create and export the router
const router: Router = express.Router();

// Mount all ticker routes
router.use("/", tickerRoutes);

export default router;
