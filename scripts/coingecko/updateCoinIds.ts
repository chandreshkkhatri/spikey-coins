#!/usr/bin/env node
/**
 * Script to generate and update coingecko-ids.json mapping file
 * Maps Binance USDT symbols to CoinGecko IDs for market data lookup
 */
import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import CoinGeckoClient, { CoinListItem, CoinGeckoIdMapping } from "./CoinGeckoClient.js";

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Major USDT trading pairs from Binance (without USDT suffix)
const MAJOR_SYMBOLS = [
  "BTC", "ETH", "USDC", "SOL", "PEPE", "XRP", "DOGE", "TRX", "BNB", "SUI",
  "SHIB", "ADA", "TON", "AVAX", "LINK", "BCH", "DOT", "NEAR", "LTC", "UNI",
  "ICP", "MATIC", "APT", "STX", "HBAR", "CRO", "FIL", "ETC", "MNT", "IMX",
  "INJ", "ATOM", "OP", "TIA", "RNDR", "GRT", "TAO", "RUNE", "FET", "AR",
  "NEAR", "LDO", "HBAR", "APT", "MASK", "SHIB", "ENS", "FLOKI", "DOT", "BONK"
];

/**
 * Create fuzzy matching for symbol to CoinGecko ID mapping
 */
function findBestMatch(symbol: string, coinsList: CoinListItem[]): CoinListItem | null {
  const symbolLower = symbol.toLowerCase();
  
  // Direct symbol match (highest priority)
  let directMatch = coinsList.find(coin => coin.symbol.toLowerCase() === symbolLower);
  if (directMatch) return directMatch;
  
  // Special cases for known mappings
  const specialMappings: { [key: string]: string } = {
    "BTC": "bitcoin",
    "ETH": "ethereum",
    "BNB": "binancecoin",
    "USDC": "usd-coin",
    "SOL": "solana",
    "XRP": "ripple",
    "DOGE": "dogecoin",
    "ADA": "cardano",
    "DOT": "polkadot",
    "LINK": "chainlink",
    "LTC": "litecoin",
    "BCH": "bitcoin-cash",
    "UNI": "uniswap",
    "MATIC": "matic-network",
    "ATOM": "cosmos",
    "FIL": "filecoin",
    "TRX": "tron",
    "ETC": "ethereum-classic",
    "AVAX": "avalanche-2",
    "NEAR": "near",
    "ICP": "internet-computer",
    "SHIB": "shiba-inu",
    "APT": "aptos",
    "OP": "optimism",
    "CRO": "crypto-com-chain",
    "HBAR": "hedera-hashgraph",
    "STX": "stacks",
    "INJ": "injective-protocol",
    "GRT": "the-graph",
    "RNDR": "render-token",
    "RUNE": "thorchain",
    "FET": "fetch-ai",
    "AR": "arweave",
    "LDO": "lido-dao",
    "ENS": "ethereum-name-service",
    "MNT": "mantle",
    "TIA": "celestia",
    "TON": "the-open-network",
    "IMX": "immutable-x",
    "TAO": "bittensor",
    "FLOKI": "floki",
    "BONK": "bonk",
    "PEPE": "pepe"
  };
  
  if (specialMappings[symbol.toUpperCase()]) {
    const specialId = specialMappings[symbol.toUpperCase()];
    const specialMatch = coinsList.find(coin => coin.id === specialId);
    if (specialMatch) return specialMatch;
  }
  
  // Name-based matching (fallback)
  const nameMatch = coinsList.find(coin => 
    coin.name.toLowerCase().includes(symbolLower) ||
    symbolLower.includes(coin.name.toLowerCase().split(' ')[0])
  );
  
  return nameMatch || null;
}

async function updateCoinIds() {
  console.log("🚀 Starting CoinGecko IDs mapping update...");

  try {
    // Fetch the complete list of coins from CoinGecko
    const coinsList = await CoinGeckoClient.fetchCoinsList();
    
    if (!coinsList || coinsList.length === 0) {
      console.error("❌ Failed to fetch coins list from CoinGecko");
      process.exit(1);
    }

    console.log(`📋 Fetched ${coinsList.length} coins from CoinGecko`);

    // Create mappings for major symbols
    const mappings: CoinGeckoIdMapping[] = [];
    const unmatchedSymbols: string[] = [];

    for (const symbol of MAJOR_SYMBOLS) {
      const match = findBestMatch(symbol, coinsList);
      
      if (match) {
        mappings.push({
          id: match.id,
          symbol: match.symbol,
          name: match.name
        });
        console.log(`✅ ${symbol} → ${match.id} (${match.name})`);
      } else {
        unmatchedSymbols.push(symbol);
        console.log(`❌ No match found for ${symbol}`);
      }
    }

    // Prepare output directory
    const outputDir = process.env.OUTPUT_DIR || "../node-server/coin-data";
    const outputPath = path.resolve(__dirname, outputDir);
    
    // Ensure output directory exists
    await fs.mkdir(outputPath, { recursive: true });
    
    // Write to coingecko-ids.json file
    const filePath = path.join(outputPath, "coingecko-ids.json");
    await fs.writeFile(filePath, JSON.stringify(mappings, null, 2));
    
    console.log(`\\n✅ Successfully updated coingecko-ids.json with ${mappings.length} mappings`);
    console.log(`📁 File saved to: ${filePath}`);
    
    if (unmatchedSymbols.length > 0) {
      console.log(`\\n⚠️ Unmatched symbols (${unmatchedSymbols.length}): ${unmatchedSymbols.join(", ")}`);
      console.log("💡 You may need to add manual mappings for these symbols");
    }
    
    console.log("🎉 CoinGecko IDs mapping update completed!");
    
  } catch (error: any) {
    console.error("❌ Error updating CoinGecko IDs:", error.message);
    process.exit(1);
  }
}

// Run the script if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  updateCoinIds().catch((error) => {
    console.error("💥 Script failed:", error);
    process.exit(1);
  });
}

export default updateCoinIds;
