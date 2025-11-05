/**
 * Chat Service
 * Handles chat interactions using OpenAI and Gemini models with web search capabilities
 */

import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import logger from "../utils/logger.js";

interface ChatMessage {
  role: "user" | "model" | "assistant" | "developer";
  content: string;
}

interface ChatResponse {
  message: string;
  timestamp: Date;
}

type ChatClient = OpenAI | GoogleGenerativeAI;

class ChatService {
  private static instance: ChatService;
  private client: ChatClient;
  private model: string;

  private constructor() {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const geminiApiKey = process.env.GEMINI_API_KEY;
    const model = process.env.AI_MODEL || "gpt-4o";

    this.model = model;

    if (model.startsWith("gemini")) {
      if (!geminiApiKey) {
        throw new Error("GEMINI_API_KEY environment variable is required for Gemini models");
      }
      this.client = new GoogleGenerativeAI(geminiApiKey);
    } else {
      if (!openaiApiKey) {
        throw new Error("OPENAI_API_KEY environment variable is required for OpenAI models");
      }
      this.client = new OpenAI({ apiKey: openaiApiKey });
    }

    logger.info(`ChatService initialized with model: ${this.model}`);
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

      if (this.client instanceof OpenAI) {
        return this.processWithOpenAI(message, conversationHistory);
      } else if (this.client instanceof GoogleGenerativeAI) {
        return this.processWithGemini(message, conversationHistory);
      } else {
        throw new Error("Unsupported chat client");
      }
    } catch (error) {
      logger.error(`ChatService: Error processing message:`, error);
      throw new Error(
        `Failed to process message: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  private async processWithOpenAI(message: string, conversationHistory: ChatMessage[]): Promise<ChatResponse> {
    const openai = this.client as OpenAI;
    const systemPrompt = `You are a knowledgeable cryptocurrency and financial markets assistant. You help users understand crypto markets, analyze trends, provide token information, and answer questions about portfolios and trading strategies.

When answering:
1. Be concise but informative
2. Focus on information valuable to cryptocurrency traders and investors
3. Provide balanced, objective analysis
4. Always maintain a professional but friendly tone`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.slice(-10).map(msg => ({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: msg.content
      })),
      { role: "user", content: message }
    ] as any[];

    const response = await openai.chat.completions.create({
      model: this.model,
      messages,
    });

    const responseContent = response.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error("No response from OpenAI");
    }

    return { message: responseContent, timestamp: new Date() };
  }

  private async processWithGemini(message: string, conversationHistory: ChatMessage[]): Promise<ChatResponse> {
    const genAI = this.client as GoogleGenerativeAI;
    const generativeModel = genAI.getGenerativeModel({ model: this.model });

    const chat = generativeModel.startChat({
      history: conversationHistory.map(msg => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }]
      })),
    });

    const result = await chat.sendMessage(message);
    const response = result.response;
    const responseContent = response.text();

    if (!responseContent) {
      throw new Error("No response from Gemini");
    }

    return { message: responseContent, timestamp: new Date() };
  }
}

export default ChatService;
export type { ChatMessage };