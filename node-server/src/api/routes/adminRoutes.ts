/**
 * Admin routes for manual operations
 */
import { Router, Request, Response } from "express";
import CoinGeckoClient from "../../external/CoinGeckoClient.js";
import logger from "../../utils/logger.js";
import fs from "fs/promises";
import path from "path";

const router = Router();

/**
 * Manually trigger CoinGecko data update to coinmarketcap.json
 */
router.post("/update-coingecko-data", async (req: Request, res: Response): Promise<void> => {
  try {
    logger.info("Admin: Manual CoinGecko data update triggered");
    
    // Fetch data from CoinGecko
    const marketData = await CoinGeckoClient.fetchMarketData();
    
    if (!marketData || marketData.length === 0) {
      res.status(500).json({
        error: "Failed to fetch market data from CoinGecko",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Write to coinmarketcap.json file
    const filePath = path.join(process.cwd(), "coin-data", "coinmarketcap.json");
    await fs.writeFile(filePath, JSON.stringify(marketData, null, 2));
    
    logger.info(`Admin: Successfully updated coinmarketcap.json with ${marketData.length} entries`);
    
    res.json({
      success: true,
      message: `Updated coinmarketcap.json with ${marketData.length} entries`,
      timestamp: new Date().toISOString(),
      count: marketData.length,
    });
  } catch (error) {
    logger.error("Admin: Error updating CoinGecko data:", error);
    res.status(500).json({
      error: "Failed to update CoinGecko data",
      details: (error as Error).message,
      timestamp: new Date().toISOString(),
    });
  }
});

export default router; 