/**
 * Chat API Routes
 * Handles chat interactions with GPT-5 and web search
 */

import { Router, Request, Response } from "express";
import ChatService, { ChatMessage } from "../services/ChatService.js";
import logger from "../utils/logger.js";

const router = Router();

/**
 * POST /api/chat
 * Process a chat message and return AI response
 */
router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const { message, conversationHistory } = req.body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: "Message is required",
      });
      return;
    }

    // Validate conversation history if provided
    let history: ChatMessage[] = [];
    if (conversationHistory) {
      if (!Array.isArray(conversationHistory)) {
        res.status(400).json({
          success: false,
          error: "Conversation history must be an array",
        });
        return;
      }

      // Validate each message in history
      for (const msg of conversationHistory) {
        if (!msg.role || !msg.content ||
            !["developer", "user", "assistant"].includes(msg.role) ||
            typeof msg.content !== "string") {
          res.status(400).json({
            success: false,
            error: "Invalid conversation history format",
          });
          return;
        }
      }
      history = conversationHistory;
    }

    logger.info(`Chat API: Processing message from user with ${history.length} history messages`);

    const chatService = ChatService.getInstance();
    const response = await chatService.processMessage(message.trim(), history);

    res.json({
      success: true,
      data: response,
    });
  } catch (error) {
    logger.error("Chat API: Error processing message:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to process message",
    });
  }
});

export default router;