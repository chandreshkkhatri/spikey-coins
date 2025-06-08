/**
 * Refactored ticker router using modular architecture
 * This file now serves as the main entry point that orchestrates all the modules
 */

const express = require("express");
const tickerRoutes = require("../routes/tickerRoutes");
const { initializeServices } = require("../services/serviceInitializer");

// Initialize all services (WebSocket connections, API clients, etc.)
initializeServices();

// Create and export the router
const router = express.Router();

// Mount all ticker routes
router.use("/", tickerRoutes);

module.exports = router;
