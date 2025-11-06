/**
 * Chat Service
 * Handles chat interactions using Gemini models with web search capabilities
 */

import AIClient from "../utils/aiClient.js";
import logger from "../utils/logger.js";

interface ChatMessage {
  role: "user" | "model" | "assistant" | "developer";
  content: string;
}

interface ChatResponse {
  message: string;
  timestamp: Date;
}

class ChatService {
  private static instance: ChatService;
  private aiClient: AIClient;

  private constructor() {
    this.aiClient = new AIClient();
    logger.info(`ChatService initialized with model: ${this.aiClient.getModel()}`);
  }

  static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService();
    }
    return ChatService.instance;
  }

  /**
   * Process a chat message using the configured AI model
   */
  async processMessage(message: string, conversationHistory: ChatMessage[] = []): Promise<ChatResponse> {
    try {
      logger.info(`ChatService: Processing message: ${message}`);

      const systemPrompt = `You are a knowledgeable cryptocurrency and financial markets assistant with access to real-time web search. You help users understand crypto markets, analyze trends, provide token information, and answer questions about portfolios and trading strategies.

When answering:
1. Be concise but informative
2. Focus on information valuable to cryptocurrency traders and investors
3. Provide balanced, objective analysis
4. Always maintain a professional but friendly tone
5. When asked about recent events or price movements, search the web for current information`;

      // Build conversation context
      const conversationContext = conversationHistory
        .slice(-10) // Keep last 10 messages for context
        .map(msg => `${msg.role === "assistant" || msg.role === "model" ? "Assistant" : "User"}: ${msg.content}`)
        .join("\n\n");

      const fullPrompt = conversationContext 
        ? `${conversationContext}\n\nUser: ${message}`
        : message;

      // Generate response with web search enabled
      const responseContent = await this.aiClient.generateCompletion(fullPrompt, {
        systemPrompt,
        useWebSearch: true
      });

      if (!responseContent) {
        throw new Error("No response from AI");
      }

      return { message: responseContent, timestamp: new Date() };
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