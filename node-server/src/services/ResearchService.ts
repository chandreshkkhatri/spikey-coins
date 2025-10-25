/**
 * Research Service
 * Automated research on top movers to identify market movement causes
 */

import OpenAI from "openai";
import { ResearchModel } from "../models/Research.js";
import { SummaryModel } from "../models/Summary.js";
import DatabaseConnection from "./DatabaseConnection.js";
import DataManager from "../core/DataManager.js";
import DailyCandlestickService from "./DailyCandlestickService.js";
import logger from "../utils/logger.js";

interface TopMover {
  symbol: string;
  name: string;
  priceChange: number;
  price: number;
  volume: number;
  timeframe: '24h' | '7d';
}

interface ResearchResult {
  coinSymbol: string;
  coinName: string;
  priceChange: number;
  timeframe: '24h' | '7d';
  researchContent: string;
  sources: {
    type: 'reddit' | 'news' | 'forum' | 'twitter' | 'other';
    url: string;
    title?: string;
    summary?: string;
  }[];
  isPublishable: boolean;
  publishableReason?: string;
  category: string;
  impact: 'high' | 'medium' | 'low';
}

class ResearchService {
  private static instance: ResearchService;
  private openai: OpenAI;
  private readonly DEDUPLICATION_HOURS = 4; // Don't re-research same coin within 4 hours

  private constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY environment variable is required");
    }

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Validate model is configured
    if (!process.env.OPENAI_MODEL) {
      logger.warn("OPENAI_MODEL not set, defaulting to gpt-4o");
    }
  }

  static getInstance(): ResearchService {
    if (!ResearchService.instance) {
      ResearchService.instance = new ResearchService();
    }
    return ResearchService.instance;
  }

  /**
   * Get top 5 gainers and losers from current ticker data
   * For 24h: uses Binance ticker data
   * For 7d: uses DailyCandlestickService
   */
  private async getTopMovers(timeframe: '24h' | '7d' = '24h'): Promise<TopMover[]> {
    try {
      if (timeframe === '24h') {
        // Use 24h data from Binance tickers
        const tickers = DataManager.getAllTickers();

        if (tickers.length === 0) {
          logger.warn('ResearchService: No ticker data available');
          return [];
        }

        // Filter and format ticker data
        const formattedData = tickers
          .map((ticker: any) => ({
            symbol: ticker.s?.replace('USDT', '') || 'Unknown',
            name: ticker.s?.replace('USDT', '') || 'Unknown',
            priceChange: parseFloat(ticker.P || '0'),
            price: parseFloat(ticker.c || '0'),
            volume: parseFloat(ticker.q || '0'),
            timeframe,
          }))
          .filter((item: any) => !isNaN(item.priceChange) && item.priceChange !== 0);

        // Sort by price change
        const sortedByChange = [...formattedData].sort((a, b) => b.priceChange - a.priceChange);

        // Get top 5 gainers and losers
        const topGainers = sortedByChange.slice(0, 5);
        const topLosers = sortedByChange.slice(-5).reverse();

        return [...topGainers, ...topLosers];
      } else {
        // Use 7d data from DailyCandlestickService
        const dailyCandlestickService = DailyCandlestickService.getInstance();
        const topMovers7d = await dailyCandlestickService.get7dTopMovers(5);
        
        if (!topMovers7d.gainers || !topMovers7d.losers) {
          logger.warn('ResearchService: No 7d data available');
          return [];
        }

        // Format to TopMover interface
        const formattedGainers: TopMover[] = topMovers7d.gainers.map((item: any) => ({
          symbol: item.symbol,
          name: item.name || item.symbol,
          priceChange: item.change_7d,
          price: parseFloat(item.price),
          volume: parseFloat(item.volume),
          timeframe: '7d',
        }));

        const formattedLosers: TopMover[] = topMovers7d.losers.map((item: any) => ({
          symbol: item.symbol,
          name: item.name || item.symbol,
          priceChange: item.change_7d,
          price: parseFloat(item.price),
          volume: parseFloat(item.volume),
          timeframe: '7d',
        }));

        return [...formattedGainers, ...formattedLosers];
      }
    } catch (error) {
      logger.error('ResearchService: Error getting top movers:', error);
      return [];
    }
  }

  /**
   * Quick pre-screening to check if there's a significant event worth researching
   * Returns true if there's a credible event, false if it's just market noise
   */
  private async hasSignificantEvent(mover: TopMover): Promise<{ hasEvent: boolean; reason: string }> {
    try {
      const prompt = `You are a cryptocurrency analyst. Quickly check if there's a SIGNIFICANT EVENT that might explain this price movement:

Coin: ${mover.symbol}
Price Change: ${mover.priceChange > 0 ? '+' : ''}${mover.priceChange.toFixed(2)}% (${mover.timeframe})
Current Price: $${mover.price}

Use web search to quickly check for:
1. Major news (partnerships, listings, regulations)
2. Technical developments (mainnet launches, upgrades)
3. Market events (hacks, exploits, major announcements)
4. Significant social media buzz with credible sources

Respond with JSON:
{
  "hasEvent": true/false,
  "reason": "Brief explanation (1 sentence)"
}

Mark hasEvent as TRUE only if you find CREDIBLE evidence of a significant event. Mark FALSE for:
- Normal market volatility
- Pump and dump schemes
- No clear cause found
- Speculation without evidence`;

      const response = await this.openai.responses.create({
        model: process.env.OPENAI_MODEL || "gpt-4o",
        tools: [
          {
            type: "web_search",
          },
        ],
        input: prompt,
      });

      const responseContent = response.output_text;
      if (!responseContent) {
        return { hasEvent: false, reason: "No response from AI" };
      }

      // Parse JSON response
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : responseContent;
      const parsed = JSON.parse(jsonString);

      return {
        hasEvent: parsed.hasEvent || false,
        reason: parsed.reason || "Unknown",
      };
    } catch (error) {
      logger.error(`ResearchService: Error in pre-screening for ${mover.symbol}:`, error);
      // On error, assume there might be an event (fail open)
      return { hasEvent: true, reason: "Pre-screening failed, proceeding with research" };
    }
  }

  /**
   * Research a specific coin using AI with web search
   */
  private async researchCoin(mover: TopMover): Promise<ResearchResult> {
    try {
      logger.info(`ResearchService: Researching ${mover.symbol} (${mover.priceChange > 0 ? '+' : ''}${mover.priceChange.toFixed(2)}%)`);

      const prompt = `You are a cryptocurrency research analyst. Your task is to research why a specific cryptocurrency has had significant price movement.

Coin: ${mover.name} (${mover.symbol})
Price Change: ${mover.priceChange > 0 ? '+' : ''}${mover.priceChange.toFixed(2)}% (${mover.timeframe})
Current Price: $${mover.price.toFixed(mover.price >= 1 ? 2 : 6)}
Volume: $${mover.volume.toLocaleString()}

Research the following sources to identify the cause of this price movement:
1. Recent news articles about ${mover.name}
2. Reddit discussions (r/cryptocurrency, r/CryptoMarkets, coin-specific subreddits)
3. Crypto forums and social media
4. Any major announcements or partnerships

Analyze whether the research indicates a REASONABLE CAUSE for the price movement. Consider:
- Is there a clear catalyst (partnership, listing, upgrade, regulatory news)?
- Is the news credible and from reliable sources?
- Does the timing align with the price movement?
- Is there substantial discussion/evidence to support causation?

Respond with a JSON object:
{
  "researchContent": "Detailed summary of findings (2-3 sentences)",
  "sources": [
    {
      "type": "reddit|news|forum|twitter|other",
      "url": "source URL",
      "title": "source title",
      "summary": "brief summary of what this source says"
    }
  ],
  "isPublishable": true/false,
  "publishableReason": "Why this is/isn't publishable (1-2 sentences explaining if there's a reasonable cause)",
  "category": "Technology|Partnership|Regulatory|Market|DeFi|NFT|General",
  "impact": "high|medium|low"
}

IMPORTANT: Only mark isPublishable as true if you find CREDIBLE evidence that reasonably explains the price movement. Speculation, pump & dump, or unclear causes should be marked false.`;

      const response = await this.openai.responses.create({
        model: process.env.OPENAI_MODEL || "gpt-4o",
        tools: [
          {
            type: "web_search",
          },
        ],
        input: prompt,
      });

      const responseContent = response.output_text;
      if (!responseContent) {
        throw new Error("No response from OpenAI");
      }

      logger.info(`ResearchService: Received response from OpenAI for ${mover.symbol}`);

      // Parse the JSON response
      let parsedResponse;
      try {
        const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : responseContent;
        parsedResponse = JSON.parse(jsonString);
      } catch (parseError) {
        logger.error("ResearchService: Failed to parse OpenAI response as JSON:", parseError);
        // Fallback
        parsedResponse = {
          researchContent: responseContent.substring(0, 300),
          sources: [],
          isPublishable: false,
          publishableReason: "Failed to parse research response",
          category: "General",
          impact: "medium",
        };
      }

      return {
        coinSymbol: mover.symbol,
        coinName: mover.name,
        priceChange: mover.priceChange,
        timeframe: mover.timeframe,
        researchContent: parsedResponse.researchContent || "No research content available",
        sources: parsedResponse.sources || [],
        isPublishable: parsedResponse.isPublishable || false,
        publishableReason: parsedResponse.publishableReason,
        category: parsedResponse.category || "General",
        impact: parsedResponse.impact || "medium",
      };
    } catch (error) {
      logger.error(`ResearchService: Error researching ${mover.symbol}:`, error);
      throw error;
    }
  }

  /**
   * Find recent research for a coin
   */
  private async findRecentResearch(
    coinSymbol: string,
    timeframe: '24h' | '7d',
    hoursAgo: number = this.DEDUPLICATION_HOURS
  ): Promise<any | null> {
    try {
      if (!DatabaseConnection.isConnectionReady()) {
        await DatabaseConnection.initialize();
      }

      const cutoffTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);

      const recentResearch = await ResearchModel.findOne({
        coinSymbol,
        timeframe,
        researchedAt: { $gte: cutoffTime },
      })
        .sort({ researchedAt: -1 })
        .lean();

      return recentResearch;
    } catch (error) {
      logger.error(`ResearchService: Error finding recent research for ${coinSymbol}:`, error);
      return null;
    }
  }

  /**
   * Check if new research has significant new information compared to old research
   */
  private async hasSignificantNewInfo(
    oldResearch: any,
    newResearch: ResearchResult
  ): Promise<{ hasNewInfo: boolean; reason: string }> {
    try {
      const prompt = `You are comparing two pieces of cryptocurrency research to determine if there's significant new information.

OLD RESEARCH (from ${new Date(oldResearch.researchedAt).toLocaleString()}):
${oldResearch.researchContent}
Sources: ${oldResearch.sources.map((s: any) => s.url).join(', ')}

NEW RESEARCH (just now):
${newResearch.researchContent}
Sources: ${newResearch.sources.map((s: any) => s.url).join(', ')}

Determine if the NEW research contains SIGNIFICANT new information that wasn't in the OLD research. Consider:
- Are there new events, announcements, or developments?
- Are the sources substantially different?
- Has the narrative or understanding of the price movement changed?
- Is there new credible evidence not present before?

Minor differences like rewording, slight timing differences, or the same news from different sources don't count as significant.

Respond with JSON:
{
  "hasNewInfo": true/false,
  "reason": "Brief explanation (1-2 sentences)"
}`;

      const response = await this.openai.responses.create({
        model: process.env.OPENAI_MODEL || "gpt-4o",
        input: prompt,
      });

      const responseContent = response.output_text;
      if (!responseContent) {
        return { hasNewInfo: true, reason: "Could not determine, assuming new info" };
      }

      const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : responseContent;
      const parsed = JSON.parse(jsonString);

      return {
        hasNewInfo: parsed.hasNewInfo || false,
        reason: parsed.reason || "Unknown",
      };
    } catch (error) {
      logger.error("ResearchService: Error comparing research:", error);
      // Default to assuming there's new info if we can't determine
      return { hasNewInfo: true, reason: "Error during comparison, assuming new info" };
    }
  }

  /**
   * Save research to database and create summary if publishable
   */
  private async saveResearch(research: ResearchResult): Promise<void> {
    try {
      if (!DatabaseConnection.isConnectionReady()) {
        await DatabaseConnection.initialize();
      }

      // Save research to database
      const researchDoc = await ResearchModel.create({
        coinSymbol: research.coinSymbol,
        coinName: research.coinName,
        priceChange: research.priceChange,
        timeframe: research.timeframe,
        researchContent: research.researchContent,
        sources: research.sources,
        isPublishable: research.isPublishable,
        publishableReason: research.publishableReason,
        category: research.category,
        impact: research.impact,
        researchedAt: new Date(),
      });

      logger.info(`ResearchService: Saved research for ${research.coinSymbol} (publishable: ${research.isPublishable})`);

      // If publishable, create a summary entry
      if (research.isPublishable) {
        const title = `${research.coinSymbol}: ${research.priceChange > 0 ? '+' : ''}${research.priceChange.toFixed(2)}% - ${research.category}`;

        await SummaryModel.create({
          researchId: researchDoc._id,
          title,
          isPublished: true,
          publishedAt: new Date(),
        });

        logger.info(`ResearchService: Created summary for ${research.coinSymbol}`);
      }
    } catch (error) {
      logger.error(`ResearchService: Error saving research for ${research.coinSymbol}:`, error);
      throw error;
    }
  }

  /**
   * Run automated research on top movers with smart duplicate handling
   * This is called by the cron job every 2 hours
   * Researches both 24h and 7d top movers with event pre-screening
   * @deprecated timeframe parameter - now always researches both 24h and 7d
   */
  async runAutomatedResearch(timeframe?: '24h' | '7d'): Promise<void> {
    try {
      logger.info(`ResearchService: Starting automated research for both 24h and 7d top movers`);

      // Get top movers from both timeframes
      const topMovers24h = await this.getTopMovers('24h');
      const topMovers7d = await this.getTopMovers('7d');
      
      // Combine and deduplicate (a coin might be in both lists)
      const allMoversMap = new Map<string, TopMover>();
      
      [...topMovers24h, ...topMovers7d].forEach(mover => {
        // If coin exists, keep the one with larger absolute change
        const existing = allMoversMap.get(mover.symbol);
        if (!existing || Math.abs(mover.priceChange) > Math.abs(existing.priceChange)) {
          allMoversMap.set(mover.symbol, mover);
        }
      });
      
      const allMovers = Array.from(allMoversMap.values());

      if (allMovers.length === 0) {
        logger.warn('ResearchService: No top movers found, skipping research');
        return;
      }

      logger.info(`ResearchService: Found ${allMovers.length} unique top movers (${topMovers24h.length} from 24h, ${topMovers7d.length} from 7d)`);

      // Phase 1: Pre-screen all coins to find those with significant events
      logger.info(`ResearchService: Phase 1 - Pre-screening ${allMovers.length} coins for significant events...`);
      
      const coinsWithEvents: TopMover[] = [];
      const coinsWithoutEvents: { symbol: string; reason: string }[] = [];
      
      for (const mover of allMovers) {
        try {
          const eventCheck = await this.hasSignificantEvent(mover);
          
          if (eventCheck.hasEvent) {
            logger.info(`ResearchService: ✅ ${mover.symbol} (${mover.priceChange > 0 ? '+' : ''}${mover.priceChange.toFixed(2)}% ${mover.timeframe}) - ${eventCheck.reason}`);
            coinsWithEvents.push(mover);
          } else {
            logger.info(`ResearchService: ❌ ${mover.symbol} (${mover.priceChange > 0 ? '+' : ''}${mover.priceChange.toFixed(2)}% ${mover.timeframe}) - ${eventCheck.reason}`);
            coinsWithoutEvents.push({ symbol: mover.symbol, reason: eventCheck.reason });
          }
          
          // Small delay between pre-screening calls
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          logger.error(`ResearchService: Error pre-screening ${mover.symbol}:`, error);
          // On error, include the coin (fail open)
          coinsWithEvents.push(mover);
        }
      }
      
      logger.info(`ResearchService: Pre-screening complete - ${coinsWithEvents.length} coins with events, ${coinsWithoutEvents.length} without`);
      
      if (coinsWithEvents.length === 0) {
        logger.info('ResearchService: No coins with significant events found, skipping full research');
        return;
      }

      // Phase 2: Full research only for coins with significant events
      logger.info(`ResearchService: Phase 2 - Full research for ${coinsWithEvents.length} coins with events...`);

      // Research each coin sequentially to avoid rate limits
      let publishableCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;
      let newCount = 0;
      let errorCount = 0;

      for (const mover of coinsWithEvents) {
        try {
          // Check if this coin was recently researched
          const recentResearch = await this.findRecentResearch(
            mover.symbol,
            mover.timeframe,
            this.DEDUPLICATION_HOURS
          );

          if (recentResearch) {
            logger.info(
              `ResearchService: Found recent research for ${mover.symbol} (${new Date(recentResearch.researchedAt).toLocaleTimeString()})`
            );

            // Perform new research to check for updates
            const newResearch = await this.researchCoin(mover);

            // Compare with previous research
            const comparison = await this.hasSignificantNewInfo(recentResearch, newResearch);

            if (comparison.hasNewInfo) {
              // Update existing research with new information
              logger.info(
                `ResearchService: Updating ${mover.symbol} - ${comparison.reason}`
              );

              await ResearchModel.findByIdAndUpdate(recentResearch._id, {
                $set: {
                  priceChange: newResearch.priceChange,
                  researchContent: newResearch.researchContent,
                  sources: newResearch.sources,
                  isPublishable: newResearch.isPublishable,
                  publishableReason: newResearch.publishableReason,
                  category: newResearch.category,
                  impact: newResearch.impact,
                  researchedAt: new Date(),
                  updatedAt: new Date(),
                },
              });

              // Update summary if it exists and research is publishable
              if (newResearch.isPublishable) {
                const existingSummary = await SummaryModel.findOne({
                  researchId: recentResearch._id,
                });

                const newTitle = `${newResearch.coinSymbol}: ${newResearch.priceChange > 0 ? '+' : ''}${newResearch.priceChange.toFixed(2)}% - ${newResearch.category}`;

                if (existingSummary) {
                  await SummaryModel.findByIdAndUpdate(existingSummary._id, {
                    $set: {
                      title: newTitle,
                      isPublished: true,
                      publishedAt: new Date(),
                      updatedAt: new Date(),
                    },
                  });
                } else {
                  // Create new summary if it didn't exist
                  await SummaryModel.create({
                    researchId: recentResearch._id,
                    title: newTitle,
                    isPublished: true,
                    publishedAt: new Date(),
                  });
                }
                publishableCount++;
              }

              updatedCount++;
            } else {
              // No significant new info, just update timestamp
              logger.info(
                `ResearchService: No significant update for ${mover.symbol} - ${comparison.reason}`
              );

              await ResearchModel.findByIdAndUpdate(recentResearch._id, {
                $set: {
                  updatedAt: new Date(),
                },
              });

              skippedCount++;

              if (recentResearch.isPublishable) {
                publishableCount++;
              }
            }
          } else {
            // No recent research found, create new entry
            logger.info(`ResearchService: Creating new research for ${mover.symbol}`);

            const research = await this.researchCoin(mover);
            await this.saveResearch(research);

            if (research.isPublishable) {
              publishableCount++;
            }

            newCount++;
          }

          // Add a small delay between requests to respect rate limits
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          errorCount++;
          logger.error(`ResearchService: Failed to research ${mover.symbol} (Error ${errorCount}/${coinsWithEvents.length}):`, error);

          // If too many failures, abort early to prevent wasting resources
          if (errorCount >= Math.ceil(coinsWithEvents.length / 2)) {
            logger.error(`ResearchService: Too many failures (${errorCount}/${coinsWithEvents.length}), aborting research`);
            throw new Error(`Research failed for ${errorCount}/${coinsWithEvents.length} coins - possible API issue`);
          }

          continue;
        }
      }

      logger.info(
        `ResearchService: Completed research - New: ${newCount}, Updated: ${updatedCount}, Skipped: ${skippedCount}, Errors: ${errorCount}, Publishable: ${publishableCount}/${coinsWithEvents.length}`
      );
      logger.info(
        `ResearchService: Summary - Screened: ${allMovers.length}, With Events: ${coinsWithEvents.length}, Without Events: ${coinsWithoutEvents.length}, Researched: ${newCount + updatedCount}, Published: ${publishableCount}`
      );

      // Log warning if there were any errors
      if (errorCount > 0) {
        logger.warn(`ResearchService: ${errorCount} research failures occurred during this run`);
      }
    } catch (error) {
      logger.error('ResearchService: Error in automated research:', error);
      throw error;
    }
  }

  /**
   * Get latest published summaries with populated research data
   */
  async getLatestSummaries(limit: number = 10): Promise<any[]> {
    try {
      if (!DatabaseConnection.isConnectionReady()) {
        await DatabaseConnection.initialize();
      }

      const summaries = await SummaryModel
        .find({ isPublished: true })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('researchId')
        .lean();

      return summaries.map((summary: any) => {
        const research = summary.researchId;
        return {
          _id: summary._id,
          title: summary.title,
          summary: research?.researchContent || '',
          source: research?.sources?.[0]?.url || 'Research',
          category: research?.category || 'General',
          impact: research?.impact || 'medium',
          url: research?.sources?.[0]?.url,
          coinSymbol: research?.coinSymbol,
          priceChange: research?.priceChange,
          timeframe: research?.timeframe,
          createdAt: summary.createdAt,
          timestamp: summary.publishedAt,
        };
      });
    } catch (error) {
      logger.error('ResearchService: Error getting latest summaries:', error);
      throw error;
    }
  }
}

export default ResearchService;
