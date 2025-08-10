#!/usr/bin/env node
/**
 * Script to fetch all Binance symbols (spot and futures), match them with CoinGecko data,
 * and create a comprehensive CSV with market cap and other information.
 * 
 * Matching strategy:
 * 1. Price-based matching: Compare current prices to find the closest match
 * 2. Name-based matching: Use coin names from Binance to match with CoinGecko
 */

import * as dotenv from "dotenv";
import * as fs from "fs/promises";
import * as path from "path";
import { fileURLToPath } from "url";
import axios, { AxiosResponse } from "axios";
import CoinGeckoClient, { CoinGeckoMarketData, CoinListItem } from "./coingecko/CoinGeckoClient.js";
import { stringify } from "csv-stringify/sync";

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Binance API constants
const BINANCE_BASE_URL = "https://api.binance.com";
const BINANCE_FUTURES_URL = "https://fapi.binance.com";

// Types for Binance API responses
interface BinanceExchangeSymbol {
  symbol: string;
  status: string;
  baseAsset: string;
  quoteAsset: string;
  baseAssetPrecision: number;
  quotePrecision: number;
  quoteAssetPrecision: number;
  baseCommissionPrecision: number;
  quoteCommissionPrecision: number;
  orderTypes: string[];
  icebergAllowed: boolean;
  ocoAllowed: boolean;
  quoteOrderQtyMarketAllowed: boolean;
  allowTrailingStop: boolean;
  cancelReplaceAllowed: boolean;
  isSpotTradingAllowed: boolean;
  isMarginTradingAllowed: boolean;
  filters: any[];
  permissions: string[];
  defaultSelfTradePreventionMode: string;
  allowedSelfTradePreventionModes: string[];
}

interface BinanceExchangeInfo {
  timezone: string;
  serverTime: number;
  symbols: BinanceExchangeSymbol[];
}

interface BinanceFuturesSymbol {
  symbol: string;
  pair: string;
  contractType: string;
  deliveryDate: number;
  onboardDate: number;
  status: string;
  maintMarginPercent: string;
  requiredMarginPercent: string;
  baseAsset: string;
  quoteAsset: string;
  marginAsset: string;
  pricePrecision: number;
  quantityPrecision: number;
  baseAssetPrecision: number;
  quotePrecision: number;
  underlyingType: string;
  underlyingSubType: string[];
  settlePlan: number;
  triggerProtect: string;
  filters: any[];
}

interface BinanceFuturesExchangeInfo {
  timezone: string;
  serverTime: number;
  symbols: BinanceFuturesSymbol[];
}

interface BinanceTicker {
  symbol: string;
  price: string;
}

interface MatchedSymbol {
  binanceSymbol: string;
  baseAsset: string;
  quoteAsset: string;
  marketType: "spot" | "futures";
  binancePrice: number;
  coingeckoId: string;
  coingeckoSymbol: string;
  coingeckoName: string;
  coingeckoPrice: number;
  priceMatchScore: number;
  symbolMatchCount: number;  // Number of CoinGecko coins with matching symbol
  matchCandidates: string;    // JSON string of all candidates with their prices
  marketCap: number;
  marketCapRank: number;
  volume24h: number;
  circulatingSupply: number;
  totalSupply: number | null;
  maxSupply: number | null;
  ath: number;
  athDate: string;
  atl: number;
  atlDate: string;
  priceChange24h: number;
  priceChangePercentage24h: number;
}

/**
 * Fetch all spot market symbols from Binance (USDT pairs only)
 */
async function fetchBinanceSpotSymbols(): Promise<BinanceExchangeSymbol[]> {
  try {
    console.log("📡 Fetching Binance spot market USDT symbols...");
    const response: AxiosResponse<BinanceExchangeInfo> = await axios.get(
      `${BINANCE_BASE_URL}/api/v3/exchangeInfo`,
      { timeout: 30000 }
    );
    
    const activeSymbols = response.data.symbols.filter(
      (symbol) => symbol.status === "TRADING" && 
                   symbol.isSpotTradingAllowed && 
                   symbol.quoteAsset === "USDT"  // Filter for USDT pairs only
    );
    
    console.log(`✅ Fetched ${activeSymbols.length} active USDT spot symbols`);
    return activeSymbols;
  } catch (error: any) {
    console.error("❌ Error fetching spot symbols:", error.message);
    return [];
  }
}

/**
 * Fetch all futures market symbols from Binance (USDT pairs only)
 */
async function fetchBinanceFuturesSymbols(): Promise<BinanceFuturesSymbol[]> {
  try {
    console.log("📡 Fetching Binance futures market USDT symbols...");
    const response: AxiosResponse<BinanceFuturesExchangeInfo> = await axios.get(
      `${BINANCE_FUTURES_URL}/fapi/v1/exchangeInfo`,
      { timeout: 30000 }
    );
    
    const activeSymbols = response.data.symbols.filter(
      (symbol) => symbol.status === "TRADING" && 
                   symbol.quoteAsset === "USDT"  // Filter for USDT pairs only
    );
    
    console.log(`✅ Fetched ${activeSymbols.length} active USDT futures symbols`);
    return activeSymbols;
  } catch (error: any) {
    console.error("❌ Error fetching futures symbols:", error.message);
    return [];
  }
}

/**
 * Fetch current prices for all symbols
 */
async function fetchBinancePrices(isSpot: boolean = true): Promise<Map<string, number>> {
  try {
    const url = isSpot 
      ? `${BINANCE_BASE_URL}/api/v3/ticker/price`
      : `${BINANCE_FUTURES_URL}/fapi/v1/ticker/price`;
    
    console.log(`📡 Fetching ${isSpot ? "spot" : "futures"} prices...`);
    const response: AxiosResponse<BinanceTicker[]> = await axios.get(url, { timeout: 30000 });
    
    const priceMap = new Map<string, number>();
    response.data.forEach((ticker) => {
      priceMap.set(ticker.symbol, parseFloat(ticker.price));
    });
    
    console.log(`✅ Fetched prices for ${priceMap.size} ${isSpot ? "spot" : "futures"} symbols`);
    return priceMap;
  } catch (error: any) {
    console.error(`❌ Error fetching ${isSpot ? "spot" : "futures"} prices:`, error.message);
    return new Map();
  }
}

/**
 * Calculate string similarity score (Levenshtein distance based)
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  if (s1 === s2) return 1.0;
  
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(shorter, longer);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Extract base symbol and multiplier from Binance symbol
 * Examples: "1000FLOKI" -> {symbol: "FLOKI", multiplier: 1000}, "BTC" -> {symbol: "BTC", multiplier: 1}
 */
function parseSymbolAndMultiplier(binanceSymbol: string): { symbol: string; multiplier: number } {
  const match = binanceSymbol.match(/^(\d+)(.+)$/);
  if (match) {
    return {
      symbol: match[2],
      multiplier: parseInt(match[1], 10)
    };
  }
  return {
    symbol: binanceSymbol,
    multiplier: 1
  };
}

/**
 * Extract base symbol from Binance symbol by removing number prefixes
 * Examples: "1000FLOKI" -> "FLOKI", "1000000MOG" -> "MOG", "BTC" -> "BTC"
 */
function extractBaseSymbol(binanceSymbol: string): string {
  return parseSymbolAndMultiplier(binanceSymbol).symbol;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Fetch market data for specific coins by their IDs
 */
async function fetchCoinGeckoMarketDataByIds(coinIds: string[]): Promise<CoinGeckoMarketData[]> {
  const apiKey = process.env.COINGECKO_API_KEY;
  if (!apiKey) {
    console.error("❌ COINGECKO_API_KEY environment variable is required");
    return [];
  }

  const allMarketData: CoinGeckoMarketData[] = [];
  const batchSize = 250; // CoinGecko API limit per request
  
  for (let i = 0; i < coinIds.length; i += batchSize) {
    const batch = coinIds.slice(i, i + batchSize);
    const idsString = batch.join(",");
    
    try {
      console.log(`📡 Fetching market data batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(coinIds.length / batchSize)}...`);
      
      const response: AxiosResponse<CoinGeckoMarketData[]> = await axios.get(
        `https://api.coingecko.com/api/v3/coins/markets`,
        {
          params: {
            x_cg_demo_api_key: apiKey,
            vs_currency: "usd",
            ids: idsString,
            order: "market_cap_desc",
            per_page: 250,
            sparkline: false
          },
          timeout: 30000,
        }
      );
      
      allMarketData.push(...response.data);
      
      // Rate limiting - wait between requests
      if (i + batchSize < coinIds.length) {
        await new Promise(resolve => setTimeout(resolve, 1200)); // Wait 1.2 seconds between requests
      }
    } catch (error: any) {
      console.error(`❌ Error fetching batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
    }
  }
  
  return allMarketData;
}

/**
 * Find best CoinGecko match for a Binance symbol
 */
function findBestCoinGeckoMatch(
  baseAsset: string,
  binancePrice: number,
  coinsList: CoinListItem[],
  marketDataMap: Map<string, CoinGeckoMarketData>
): {
  match: CoinGeckoMarketData | null;
  priceScore: number;
  symbolMatchCount: number;
  candidates: Array<{ symbol: string; name: string; price: number; priceMatchScore: number }>;
} {
  const symbolLower = baseAsset.toLowerCase();
  const { symbol: baseSymbol, multiplier } = parseSymbolAndMultiplier(baseAsset);
  const baseSymbolLower = baseSymbol.toLowerCase();
  const scaledBinancePrice = binancePrice / multiplier; // Scale down for comparison
  const candidates: Array<{ symbol: string; name: string; price: number; priceMatchScore: number }> = [];
  
  // Find all coins with matching symbol from the complete list
  // Try both original symbol and extracted base symbol (for cases like "1000FLOKI" -> "FLOKI")
  const symbolMatches = coinsList.filter(
    (coin) => {
      const coinSymbol = coin.symbol.toLowerCase();
      return coinSymbol === symbolLower || 
             (baseSymbolLower !== symbolLower && coinSymbol === baseSymbolLower);
    }
  );
  
  // Collect all symbol match candidates with their prices and scores
  for (const coin of symbolMatches) {
    const marketData = marketDataMap.get(coin.id);
    if (marketData) {
      const priceRatio = Math.min(scaledBinancePrice, marketData.current_price) / 
                        Math.max(scaledBinancePrice, marketData.current_price);
      candidates.push({
        symbol: coin.symbol,
        name: coin.name,
        price: marketData.current_price,
        priceMatchScore: priceRatio
      });
    }
  }
  
  if (symbolMatches.length === 0) {
    // Try to find by name if no symbol match (using extracted base symbol for better matching)
    const searchTerm = baseSymbolLower !== symbolLower ? baseSymbolLower : symbolLower;
    const nameMatches = coinsList.filter((coin) => {
      const nameSimilarity = calculateStringSimilarity(searchTerm, coin.name);
      return nameSimilarity > 0.7;
    });
    
    if (nameMatches.length === 0) {
      return { match: null, priceScore: 0, symbolMatchCount: 0, candidates };
    }
    
    // Get market data for name matches and use price to determine best match
    let bestMatch: CoinGeckoMarketData | null = null;
    let bestPriceScore = 0;
    
    for (const coin of nameMatches) {
      const marketData = marketDataMap.get(coin.id);
      if (marketData) {
        const priceRatio = Math.min(scaledBinancePrice, marketData.current_price) / 
                          Math.max(scaledBinancePrice, marketData.current_price);
        
        // Add to candidates list with price match score
        candidates.push({
          symbol: coin.symbol,
          name: coin.name,
          price: marketData.current_price,
          priceMatchScore: priceRatio
        });
        
        if (priceRatio > bestPriceScore) {
          bestPriceScore = priceRatio;
          bestMatch = marketData;
        }
      }
    }
    
    return { match: bestMatch, priceScore: bestPriceScore, symbolMatchCount: symbolMatches.length, candidates };
  }
  
  // If single symbol match, get its market data
  if (symbolMatches.length === 1) {
    const marketData = marketDataMap.get(symbolMatches[0].id);
    if (marketData) {
      const priceRatio = Math.min(scaledBinancePrice, marketData.current_price) / 
                        Math.max(scaledBinancePrice, marketData.current_price);
      return { match: marketData, priceScore: priceRatio, symbolMatchCount: symbolMatches.length, candidates };
    }
    return { match: null, priceScore: 0, symbolMatchCount: symbolMatches.length, candidates };
  }
  
  // Multiple symbol matches - use price to determine best one
  let bestMatch: CoinGeckoMarketData | null = null;
  let bestPriceScore = 0;
  
  for (const coin of symbolMatches) {
    const marketData = marketDataMap.get(coin.id);
    if (marketData) {
      const priceRatio = Math.min(scaledBinancePrice, marketData.current_price) / 
                        Math.max(scaledBinancePrice, marketData.current_price);
      
      if (priceRatio > bestPriceScore) {
        bestPriceScore = priceRatio;
        bestMatch = marketData;
      }
    }
  }
  
  // Sort candidates by price match score (best first)
  candidates.sort((a, b) => b.priceMatchScore - a.priceMatchScore);
  
  return { match: bestMatch, priceScore: bestPriceScore, symbolMatchCount: symbolMatches.length, candidates };
}

/**
 * Main function to match Binance symbols with CoinGecko data
 */
async function matchBinanceWithCoinGecko() {
  console.log("🚀 Starting Binance-CoinGecko matching process...");
  
  try {
    // Fetch all required data
    console.log("\\n📡 Step 1: Fetching Binance data...");
    const [spotSymbols, futuresSymbols, spotPrices, futuresPrices] = 
      await Promise.all([
        fetchBinanceSpotSymbols(),
        fetchBinanceFuturesSymbols(),
        fetchBinancePrices(true),
        fetchBinancePrices(false)
      ]);
    
    console.log("\\n📡 Step 2: Fetching CoinGecko coins list...");
    const coinsList = await CoinGeckoClient.fetchCoinsList();
    
    if (!coinsList) {
      console.error("❌ Failed to fetch CoinGecko coins list");
      return;
    }
    
    // Collect unique base assets from Binance
    const uniqueBaseAssets = new Set<string>();
    spotSymbols.forEach(s => uniqueBaseAssets.add(s.baseAsset));
    futuresSymbols.forEach(s => uniqueBaseAssets.add(s.baseAsset));
    
    // Remove stablecoins
    ["USDT", "USDC", "BUSD", "TUSD", "DAI", "FDUSD", "USDP"].forEach(stable => uniqueBaseAssets.delete(stable));
    
    console.log(`\\n📊 Data Summary (USDT pairs only):`);
    console.log(`  - USDT Spot symbols: ${spotSymbols.length}`);
    console.log(`  - USDT Futures symbols: ${futuresSymbols.length}`);
    console.log(`  - Unique base assets to process: ${uniqueBaseAssets.size}`);
    console.log(`  - Total CoinGecko coins available: ${coinsList.length}`);
    
    // Find potential CoinGecko matches for Binance assets
    console.log("\\n🔍 Step 3: Finding potential CoinGecko matches...");
    const potentialMatches = new Set<string>();
    
    for (const baseAsset of uniqueBaseAssets) {
      const symbolLower = baseAsset.toLowerCase();
      
      // Find coins by symbol or name similarity
      const matches = coinsList.filter(coin => {
        const symbolMatch = coin.symbol.toLowerCase() === symbolLower;
        const nameMatch = calculateStringSimilarity(baseAsset, coin.name) > 0.6;
        return symbolMatch || nameMatch;
      });
      
      matches.forEach(m => potentialMatches.add(m.id));
    }
    
    console.log(`  - Found ${potentialMatches.size} potential CoinGecko matches`);
    
    // Fetch market data for all potential matches
    console.log("\\n📡 Step 4: Fetching CoinGecko market data for potential matches...");
    const coingeckoMarketData = await fetchCoinGeckoMarketDataByIds(Array.from(potentialMatches));
    
    // Create a map for quick lookup
    const marketDataMap = new Map<string, CoinGeckoMarketData>();
    coingeckoMarketData.forEach(data => marketDataMap.set(data.id, data));
    
    console.log(`  - Successfully fetched market data for ${coingeckoMarketData.length} coins`);
    
    const matchedSymbols: MatchedSymbol[] = [];
    const unmatchedSymbols: { symbol: string; baseAsset: string; marketType: string }[] = [];
    
    // Process spot symbols
    console.log("\\n🔄 Step 5: Processing USDT spot symbols...");
    let processedCount = 0;
    const processedBaseAssets = new Set<string>(); // Track processed base assets to avoid duplicates
    
    for (const symbol of spotSymbols) {
      // Skip stablecoins and wrapped tokens
      if (["USDT", "USDC", "BUSD", "TUSD", "DAI", "FDUSD", "USDP"].includes(symbol.baseAsset)) {
        continue;
      }
      
      // Skip if we already processed this base asset
      if (processedBaseAssets.has(symbol.baseAsset)) {
        continue;
      }
      
      const binancePrice = spotPrices.get(symbol.symbol);
      if (!binancePrice || binancePrice === 0) continue;
      
      const { match, priceScore, symbolMatchCount, candidates } = findBestCoinGeckoMatch(
        symbol.baseAsset,
        binancePrice,
        coinsList,
        marketDataMap
      );
      
      processedCount++;
      if (processedCount % 100 === 0) {
        console.log(`  - Processed ${processedCount} spot symbols...`);
      }
      
      if (match) {
        processedBaseAssets.add(symbol.baseAsset); // Mark as processed
        matchedSymbols.push({
          binanceSymbol: symbol.symbol,
          baseAsset: symbol.baseAsset,
          quoteAsset: symbol.quoteAsset,
          marketType: "spot",
          binancePrice,
          coingeckoId: match.id,
          coingeckoSymbol: match.symbol,
          coingeckoName: match.name,
          coingeckoPrice: match.current_price,
          priceMatchScore: priceScore,
          symbolMatchCount: symbolMatchCount,
          matchCandidates: JSON.stringify(candidates),
          marketCap: match.market_cap,
          marketCapRank: match.market_cap_rank,
          volume24h: match.total_volume,
          circulatingSupply: match.circulating_supply,
          totalSupply: match.total_supply || null,
          maxSupply: match.max_supply || null,
          ath: match.ath,
          athDate: match.ath_date,
          atl: match.atl,
          atlDate: match.atl_date,
          priceChange24h: match.price_change_24h,
          priceChangePercentage24h: match.price_change_percentage_24h
        });
      } else {
        unmatchedSymbols.push({
          symbol: symbol.symbol,
          baseAsset: symbol.baseAsset,
          marketType: "spot"
        });
      }
    }
    
    // Process futures symbols
    console.log("\\n🔄 Step 6: Processing USDT futures symbols...");
    processedCount = 0;
    for (const symbol of futuresSymbols) {
      // Skip perpetual contracts that are already covered in spot
      if (symbol.symbol.endsWith("USDT_PERP")) continue;
      
      // Skip stablecoins
      if (["USDT", "USDC", "BUSD", "TUSD", "DAI", "FDUSD", "USDP"].includes(symbol.baseAsset)) {
        continue;
      }
      
      const binancePrice = futuresPrices.get(symbol.symbol);
      if (!binancePrice || binancePrice === 0) continue;
      
      // Check if already matched in spot
      const alreadyMatched = matchedSymbols.some(
        (m) => m.baseAsset === symbol.baseAsset && m.marketType === "spot"
      );
      if (alreadyMatched) continue;
      
      const { match, priceScore, symbolMatchCount, candidates } = findBestCoinGeckoMatch(
        symbol.baseAsset,
        binancePrice,
        coinsList,
        marketDataMap
      );
      
      processedCount++;
      if (processedCount % 50 === 0) {
        console.log(`  - Processed ${processedCount} futures symbols...`);
      }
      
      if (match) {
        matchedSymbols.push({
          binanceSymbol: symbol.symbol,
          baseAsset: symbol.baseAsset,
          quoteAsset: symbol.quoteAsset,
          marketType: "futures",
          binancePrice,
          coingeckoId: match.id,
          coingeckoSymbol: match.symbol,
          coingeckoName: match.name,
          coingeckoPrice: match.current_price,
          priceMatchScore: priceScore,
          symbolMatchCount: symbolMatchCount,
          matchCandidates: JSON.stringify(candidates),
          marketCap: match.market_cap,
          marketCapRank: match.market_cap_rank,
          volume24h: match.total_volume,
          circulatingSupply: match.circulating_supply,
          totalSupply: match.total_supply || null,
          maxSupply: match.max_supply || null,
          ath: match.ath,
          athDate: match.ath_date,
          atl: match.atl,
          atlDate: match.atl_date,
          priceChange24h: match.price_change_24h,
          priceChangePercentage24h: match.price_change_percentage_24h
        });
      } else {
        unmatchedSymbols.push({
          symbol: symbol.symbol,
          baseAsset: symbol.baseAsset,
          marketType: "futures"
        });
      }
    }
    
    // Sort by market cap rank
    matchedSymbols.sort((a, b) => (a.marketCapRank || 999999) - (b.marketCapRank || 999999));
    
    // Generate CSV
    console.log("\\n📝 Generating CSV file...");
    const csvData = stringify(matchedSymbols, {
      header: true,
      columns: [
        "binanceSymbol",
        "baseAsset",
        "quoteAsset",
        "marketType",
        "binancePrice",
        "coingeckoId",
        "coingeckoSymbol",
        "coingeckoName",
        "coingeckoPrice",
        "priceMatchScore",
        "symbolMatchCount",
        "matchCandidates",
        "marketCap",
        "marketCapRank",
        "volume24h",
        "circulatingSupply",
        "totalSupply",
        "maxSupply",
        "ath",
        "athDate",
        "atl",
        "atlDate",
        "priceChange24h",
        "priceChangePercentage24h"
      ]
    });
    
    // Save CSV file
    const outputDir = path.join(path.dirname(__dirname), "output");
    await fs.mkdir(outputDir, { recursive: true });
    
    const outputPath = path.join(outputDir, "binance-coingecko-matches.csv");
    await fs.writeFile(outputPath, csvData);
    
    // Save unmatched symbols for review  
    const unmatchedPath = path.join(outputDir, "unmatched-symbols.json");
    await fs.writeFile(unmatchedPath, JSON.stringify(unmatchedSymbols, null, 2));
    
    // Print summary
    console.log("\\n✅ Matching completed successfully!");
    console.log(`📊 Results Summary:`);
    console.log(`  - Total matched symbols: ${matchedSymbols.length}`);
    console.log(`  - Spot matches: ${matchedSymbols.filter(m => m.marketType === "spot").length}`);
    console.log(`  - Futures matches: ${matchedSymbols.filter(m => m.marketType === "futures").length}`);
    console.log(`  - Unmatched symbols: ${unmatchedSymbols.length}`);
    console.log(`\\n📁 Files saved:`);
    console.log(`  - Matches: ${outputPath}`);
    console.log(`  - Unmatched: ${unmatchedPath}`);
    
    // Show top 10 matches by market cap
    console.log("\\n🏆 Top 10 matches by market cap:");
    matchedSymbols.slice(0, 10).forEach((match, index) => {
      console.log(`  ${index + 1}. ${match.coingeckoName} (${match.baseAsset}) - Market Cap: $${match.marketCap.toLocaleString()}`);
    });
    
  } catch (error: any) {
    console.error("❌ Error in matching process:", error.message);
    process.exit(1);
  }
}

// Run the script if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  matchBinanceWithCoinGecko().catch((error) => {
    console.error("💥 Script failed:", error);
    process.exit(1);
  });
}

export default matchBinanceWithCoinGecko;