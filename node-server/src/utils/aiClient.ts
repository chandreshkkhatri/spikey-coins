/**
 * AI Client Utility
 * Provides a unified interface for OpenAI and Gemini models
 */

import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import logger from "./logger.js";

export type AIProvider = "openai" | "gemini";

export interface AIClientConfig {
  model: string;
  provider: AIProvider;
}

export class AIClient {
  private openaiClient?: OpenAI;
  private geminiClient?: GoogleGenerativeAI;
  private model: string;
  private provider: AIProvider;

  constructor(config?: Partial<AIClientConfig>) {
    const model = config?.model || process.env.AI_MODEL || "gpt-4o";
    this.model = model;

    // Determine provider from model name or explicit config
    if (config?.provider) {
      this.provider = config.provider;
    } else {
      this.provider = model.startsWith("gemini") ? "gemini" : "openai";
    }

    // Initialize the appropriate client
    if (this.provider === "gemini") {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY environment variable is required for Gemini models");
      }
      this.geminiClient = new GoogleGenerativeAI(apiKey);
    } else {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error("OPENAI_API_KEY environment variable is required for OpenAI models");
      }
      this.openaiClient = new OpenAI({ apiKey });
    }

    logger.info(`AIClient initialized with provider: ${this.provider}, model: ${this.model}`);
  }

  getModel(): string {
    return this.model;
  }

  getProvider(): AIProvider {
    return this.provider;
  }

  /**
   * Generate a completion with the configured AI model
   */
  async generateCompletion(prompt: string, options?: {
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    useWebSearch?: boolean;
  }): Promise<string> {
    if (this.provider === "gemini") {
      return this.generateGeminiCompletion(prompt, options);
    } else {
      return this.generateOpenAICompletion(prompt, options);
    }
  }

  private async generateOpenAICompletion(prompt: string, options?: {
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    useWebSearch?: boolean;
  }): Promise<string> {
    if (!this.openaiClient) {
      throw new Error("OpenAI client not initialized");
    }

    const messages: any[] = [];
    
    if (options?.systemPrompt) {
      messages.push({ role: "system", content: options.systemPrompt });
    }
    
    messages.push({ role: "user", content: prompt });

    const response = await this.openaiClient.chat.completions.create({
      model: this.model,
      messages,
      temperature: options?.temperature,
      max_tokens: options?.maxTokens,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    return content;
  }

  private async generateGeminiCompletion(prompt: string, options?: {
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    useWebSearch?: boolean;
  }): Promise<string> {
    if (!this.geminiClient) {
      throw new Error("Gemini client not initialized");
    }

    // Configure tools for web search if requested
    const tools: any[] = [];
    if (options?.useWebSearch) {
      tools.push({
        googleSearch: {},
      });
    }

    const modelConfig: any = {
      model: this.model,
      generationConfig: {
        temperature: options?.temperature,
        maxOutputTokens: options?.maxTokens,
      },
    };

    // Add tools if web search is enabled
    if (tools.length > 0) {
      modelConfig.tools = tools;
    }

    // Add system instruction if provided
    if (options?.systemPrompt) {
      modelConfig.systemInstruction = options.systemPrompt;
    }

    const model = this.geminiClient.getGenerativeModel(modelConfig);

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    if (!text) {
      throw new Error("No response from Gemini");
    }

    return text;
  }
}

export default AIClient;
