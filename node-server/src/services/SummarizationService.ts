/**
 * Summarization Service
 * Fetches articles from URLs and summarizes them using AI models
 */

import AIClient from "../utils/aiClient.js";
import DatabaseConnection from "./DatabaseConnection.js";
import logger from "../utils/logger.js";

interface ArticleSummary {
  title: string;
  summary: string;
  source: string;
  url: string;
  category: string;
  impact: "high" | "medium" | "low";
  isPublished: boolean;
  timestamp: Date;
  createdAt: Date;
}

class SummarizationService {
  private static instance: SummarizationService;
  private aiClient: AIClient;

  private constructor() {
    this.aiClient = new AIClient();
  }

  static getInstance(): SummarizationService {
    if (!SummarizationService.instance) {
      SummarizationService.instance = new SummarizationService();
    }
    return SummarizationService.instance;
  }

  /**
   * Summarize an article from a URL using OpenAI with web search
   */
  async summarizeArticleFromUrl(url: string): Promise<ArticleSummary> {
    try {
      logger.info(
        `SummarizationService: Starting summarization for URL: ${url}`
      );

      // Use AI to read and summarize the article
      const prompt = `You are a cryptocurrency and financial news analyst. Your task is to read articles from URLs and create concise, informative summaries for crypto traders and investors.

When given a URL, you should:
1. Read the article content from the provided URL: ${url}
2. Create a 1-2 sentence summary that captures the key information
3. Determine the article's impact level on crypto markets (high, medium, low)
4. Categorize the article (e.g., "Market Analysis", "Regulatory", "Technology", "DeFi", "NFT", "General")
5. Extract the publication source name from the article or website

Respond with a JSON object containing:
{
  "title": "Article title",
  "summary": "1-2 sentence summary focusing on crypto market relevance",
  "source": "Publication name",
  "category": "Category name",
  "impact": "high|medium|low"
}

Focus on information that would be valuable to cryptocurrency traders and investors.

Please read this article and provide a summary: ${url}`;

      const responseContent = await this.aiClient.generateCompletion(prompt, {
        useWebSearch: true
      });
      
      if (!responseContent) {
        throw new Error("No response from AI");
      }

      logger.info(`SummarizationService: Received response from AI`);

      // Parse the JSON response
      let parsedResponse;
      try {
        // Extract JSON from the response (in case there's additional text)
        const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : responseContent;
        parsedResponse = JSON.parse(jsonString);
      } catch (parseError) {
        logger.error(
          "SummarizationService: Failed to parse AI response as JSON:",
          parseError
        );
        // Fallback: create a summary from the raw response
        parsedResponse = {
          title: "Article Summary",
          summary: responseContent.substring(0, 200),
          source: new URL(url).hostname,
          category: "General",
          impact: "medium",
        };
      }

      // Create the article summary object
      const now = new Date();
      const articleSummary: ArticleSummary = {
        title: parsedResponse.title || "Article Summary",
        summary: parsedResponse.summary || "Summary not available",
        source: parsedResponse.source || new URL(url).hostname,
        url: url,
        category: parsedResponse.category || "General",
        impact: parsedResponse.impact || "medium",
        isPublished: false, // Requires review before publishing
        timestamp: now,
        createdAt: now,
      };

      logger.info(
        `SummarizationService: Created summary for article: ${articleSummary.title}`
      );
      return articleSummary;
    } catch (error) {
      logger.error(
        `SummarizationService: Error summarizing article from ${url}:`,
        error
      );
      throw new Error(
        `Failed to summarize article: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Save article summary to database
   */
  async saveSummaryToDatabase(summary: ArticleSummary): Promise<void> {
    try {
      if (!DatabaseConnection.isConnectionReady()) {
        await DatabaseConnection.initialize();
      }

      const db = DatabaseConnection.getDatabase();
      if (!db) {
        throw new Error('Database connection not available');
      }
      const summariesCollection = db.collection("summaries");

      // Check if we already have a summary for this URL
      const existingSummary = await summariesCollection.findOne({
        url: summary.url,
      });
      if (existingSummary) {
        logger.info(
          `SummarizationService: Summary for URL ${summary.url} already exists, skipping save`
        );
        return;
      }

      // Insert the new summary
      await summariesCollection.insertOne(summary);
      logger.info(
        `SummarizationService: Saved summary to database: ${summary.title}`
      );
    } catch (error) {
      logger.error(
        "SummarizationService: Error saving summary to database:",
        error
      );
      throw new Error(
        `Failed to save summary to database: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Complete workflow: summarize article and save to database
   */
  async processArticleUrl(url: string): Promise<ArticleSummary> {
    try {
      // Validate URL
      new URL(url); // This will throw if URL is invalid

      const summary = await this.summarizeArticleFromUrl(url);
      await this.saveSummaryToDatabase(summary);

      logger.info(
        `SummarizationService: Successfully processed article: ${url}`
      );
      return summary;
    } catch (error) {
      logger.error(
        `SummarizationService: Error processing article URL ${url}:`,
        error
      );
      throw error;
    }
  }
}

export default SummarizationService;
