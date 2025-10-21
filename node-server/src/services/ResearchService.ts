/**
 * Research Service
 * Automated research on top movers to identify market movement causes
 */

import OpenAI from "openai";
import { ResearchModel } from "../models/Research.js";
import { SummaryModel } from "../models/Summary.js";
import DatabaseConnection from "./DatabaseConnection.js";
import DataManager from "../core/DataManager.js";
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
  }

  static getInstance(): ResearchService {
    if (!ResearchService.instance) {
      ResearchService.instance = new ResearchService();
    }
    return ResearchService.instance;
  }

  /**
   * Get top 5 gainers and losers from current ticker data
   */
  private getTopMovers(timeframe: '24h' | '7d' = '24h'): TopMover[] {
    try {
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
    } catch (error) {
      logger.error('ResearchService: Error getting top movers:', error);
      return [];
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
        model: "gpt-5",
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
        model: "gpt-5",
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
   */
  async runAutomatedResearch(timeframe: '24h' | '7d' = '24h'): Promise<void> {
    try {
      logger.info(`ResearchService: Starting automated research for ${timeframe} top movers`);

      const topMovers = this.getTopMovers(timeframe);

      if (topMovers.length === 0) {
        logger.warn('ResearchService: No top movers found, skipping research');
        return;
      }

      logger.info(`ResearchService: Found ${topMovers.length} top movers to research`);

      // Research each coin sequentially to avoid rate limits
      let publishableCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;
      let newCount = 0;

      for (const mover of topMovers) {
        try {
          // Check if this coin was recently researched
          const recentResearch = await this.findRecentResearch(
            mover.symbol,
            timeframe,
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
          logger.error(`ResearchService: Failed to research ${mover.symbol}, continuing with next coin:`, error);
          continue;
        }
      }

      logger.info(
        `ResearchService: Completed research - New: ${newCount}, Updated: ${updatedCount}, Skipped: ${skippedCount}, Publishable: ${publishableCount}/${topMovers.length}`
      );
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
