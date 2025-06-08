/**
 * Ticker routes definition
 */

const express = require("express");
const cors = require("cors");
const {
  getHealthCheck,
  get24hrTickerData,
  getCandlestickDataBySymbol,
  getCandlestickSummary,
  refreshMarketCapData,
  getMarketCapData,
} = require("../controllers/tickerController");

const router = express.Router();

// Apply CORS middleware
router.use(cors());

// Route definitions
router.get("/", getHealthCheck);
router.get("/24hr", get24hrTickerData);
router.get("/candlestick/:symbol", getCandlestickDataBySymbol);
router.get("/candlestick", getCandlestickSummary);
router.get("/refreshMarketcapData", refreshMarketCapData);
router.get("/marketCap", getMarketCapData);

module.exports = router;
