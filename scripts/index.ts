#!/usr/bin/env node
/**
 * Main script runner for Spikey Coins data generation scripts
 */
import { program } from "commander";
import updateMarketData from "./coingecko/updateMarketData.js";
import updateCoinIds from "./coingecko/updateCoinIds.js";

program
  .name("spikey-coins-scripts")
  .description("CLI tool for generating Spikey Coins data files")
  .version("1.0.0");

program
  .command("update-market-data")
  .description("Update market data from CoinGecko API")
  .action(async () => {
    try {
      await updateMarketData();
    } catch (error) {
      console.error("❌ Failed to update market data:", error);
      process.exit(1);
    }
  });

program
  .command("update-coin-ids")
  .description("Update CoinGecko ID mappings for Binance symbols")
  .action(async () => {
    try {
      await updateCoinIds();
    } catch (error) {
      console.error("❌ Failed to update coin IDs:", error);
      process.exit(1);
    }
  });

program
  .command("setup")
  .description("Run initial setup - update coin IDs then market data")
  .action(async () => {
    try {
      console.log("🔧 Running initial setup...");
      await updateCoinIds();
      console.log("\\n" + "=".repeat(50) + "\\n");
      await updateMarketData();
      console.log("\\n🎉 Setup completed successfully!");
    } catch (error) {
      console.error("❌ Setup failed:", error);
      process.exit(1);
    }
  });

program.parse();
