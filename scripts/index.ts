#!/usr/bin/env node
/**
 * Main script runner for Spikey Coins data generation scripts
 */
import { program } from "commander";
import matchBinanceWithCoinGecko from "./binance-coingecko-matcher/binance-coingecko-matcher.js";

program
  .name("spikey-coins-scripts")
  .description("CLI tool for generating Spikey Coins data files")
  .version("1.0.0");

program
  .command("match-binance-coingecko")
  .description("Match all Binance symbols with CoinGecko data and generate comprehensive CSV")
  .action(async () => {
    try {
      await matchBinanceWithCoinGecko();
    } catch (error) {
      console.error("❌ Failed to match Binance with CoinGecko:", error);
      process.exit(1);
    }
  });

program
  .command("generate-market-data")
  .alias("setup")
  .description("Generate comprehensive market data by matching all current Binance symbols with CoinGecko")
  .action(async () => {
    try {
      console.log("🔧 Generating comprehensive market data...");
      await matchBinanceWithCoinGecko();
      console.log("\\n🎉 Market data generation completed successfully!");
    } catch (error) {
      console.error("❌ Market data generation failed:", error);
      process.exit(1);
    }
  });

program.parse();
