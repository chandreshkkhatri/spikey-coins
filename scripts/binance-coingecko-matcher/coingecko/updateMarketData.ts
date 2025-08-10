#!/usr/bin/env node
/**
 * Script to update market data from CoinGecko
 * This replaces the admin route functionality from the Node.js server
 */
import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import CoinGeckoClient from "./CoinGeckoClient.js";

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function updateMarketData() {
  console.log("🚀 Starting CoinGecko market data update...");

  try {
    // Fetch market data from CoinGecko
    const marketData = await CoinGeckoClient.fetchMarketData();
    
    if (!marketData || marketData.length === 0) {
      console.error("❌ Failed to fetch market data from CoinGecko");
      process.exit(1);
    }

    // Prepare output directory
    const outputDir = process.env.OUTPUT_DIR || "../node-server/coin-data";
    const outputPath = path.resolve(__dirname, outputDir);
    
    // Ensure output directory exists
    await fs.mkdir(outputPath, { recursive: true });
    
    // Write to coinmarketcap.json file
    const filePath = path.join(outputPath, "coinmarketcap.json");
    await fs.writeFile(filePath, JSON.stringify(marketData, null, 2));
    
    console.log(`✅ Successfully updated coinmarketcap.json with ${marketData.length} entries`);
    console.log(`📁 File saved to: ${filePath}`);
    
    // Print summary statistics
    const symbols = marketData.map(coin => coin.symbol.toUpperCase()).slice(0, 10);
    console.log(`📊 Top 10 coins by market cap: ${symbols.join(", ")}`);
    console.log(`💰 Total market cap: $${marketData.reduce((sum, coin) => sum + coin.market_cap, 0).toLocaleString()}`);
    
    console.log("🎉 Market data update completed successfully!");
    
  } catch (error: any) {
    console.error("❌ Error updating market data:", error.message);
    process.exit(1);
  }
}

// Run the script if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  updateMarketData().catch((error) => {
    console.error("💥 Script failed:", error);
    process.exit(1);
  });
}

export default updateMarketData;
