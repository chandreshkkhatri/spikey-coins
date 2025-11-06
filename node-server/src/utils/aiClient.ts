/**
 * AI Client Utility
 * Provides a unified interface for Gemini models
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import logger from "./logger.js";

export interface CompletionOptions {
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  useWebSearch?: boolean;
}

export class AIClient {
  private geminiClient: GoogleGenerativeAI;
  private model: string;

  constructor(model?: string) {
    this.model = model || process.env.AI_MODEL || "gemini-2.5-flash";

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    this.geminiClient = new GoogleGenerativeAI(apiKey);

    logger.info(`AIClient initialized with model: ${this.model}`);
  }

  getModel(): string {
    return this.model;
  }

  /**
   * Generate a completion with the configured Gemini model
   */
  async generateCompletion(prompt: string, options?: CompletionOptions): Promise<string> {
    const modelConfig: any = {
      model: this.model,
      generationConfig: {
        temperature: options?.temperature,
        maxOutputTokens: options?.maxTokens,
      },
    };

    if (options?.useWebSearch) {
      modelConfig.tools = [{ googleSearch: {} }];
    }

    if (options?.systemPrompt) {
      modelConfig.systemInstruction = options.systemPrompt;
    }

    const model = this.geminiClient.getGenerativeModel(modelConfig);
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    if (!text) {
      throw new Error("No response from Gemini");
    }

    return text;
  }
}

export default AIClient;