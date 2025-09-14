/**
 * Chat Service
 * Handles chat interactions using OpenAI GPT-5 with web search capabilities
 */

import OpenAI from "openai";
import logger from "../utils/logger.js";

interface ChatMessage {
  role: "developer" | "user" | "assistant";
  content: string;
}

interface ChatResponse {
  message: string;
  timestamp: Date;
}

class ChatService {
  private static instance: ChatService;
  private openai: OpenAI;

  private constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY environment variable is required");
    }

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService();
    }
    return ChatService.instance;
  }

  /**
   * Process a chat message using OpenAI GPT-5 with web search
   */
  async processMessage(message: string, conversationHistory: ChatMessage[] = []): Promise<ChatResponse> {
    try {
      logger.info(`ChatService: Processing message: ${message}`);

      // Build the conversation with proper roles
      const messages: ChatMessage[] = [
        {
          role: "developer",
          content: `You are a knowledgeable cryptocurrency and financial markets assistant with web browsing capabilities. You help users understand crypto markets, analyze trends, provide token information, and answer questions about portfolios and trading strategies.

When answering:
1. Use web search when needed to provide current market data and news
2. Be concise but informative
3. Focus on information valuable to cryptocurrency traders and investors
4. Provide balanced, objective analysis
5. Always maintain a professional but friendly tone`
        },
        // Include recent conversation history (limit to last 10 messages for context)
        ...conversationHistory.slice(-10),
        {
          role: "user",
          content: message
        }
      ];

      // Use OpenAI GPT-5 with web search
      const response = await this.openai.responses.create({
        model: "gpt-5",
        tools: [
          {
            type: "web_search",
          },
        ],
        input: messages,
      });

      const responseContent = response.output_text;
      if (!responseContent) {
        throw new Error("No response from OpenAI");
      }

      logger.info(`ChatService: Received response from OpenAI`);

      const chatResponse: ChatResponse = {
        message: responseContent,
        timestamp: new Date(),
      };

      return chatResponse;
    } catch (error) {
      logger.error(`ChatService: Error processing message:`, error);
      throw new Error(
        `Failed to process message: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}

export default ChatService;
export type { ChatMessage };