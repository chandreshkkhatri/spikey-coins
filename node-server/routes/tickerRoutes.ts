/**
 * Ticker routes definition
 */

import express, { Router } from "express";
import cors from "cors";
import {
  getHealthCheck,
  get24hrTickerData,
  getCandlestickDataBySymbol,
  getCandlestickSummary,
  refreshMarketCapData,
  getMarketCapData,
} from "../controllers/tickerController";

const router: Router = express.Router();

// Apply CORS middleware
router.use(cors());

// Route definitions
router.get("/", getHealthCheck);
router.get("/24hr", get24hrTickerData);
router.get("/candlestick/:symbol", getCandlestickDataBySymbol);
router.get("/candlestick", getCandlestickSummary);
router.get("/refreshMarketcapData", refreshMarketCapData);
router.get("/marketCap", getMarketCapData);

export default router;
