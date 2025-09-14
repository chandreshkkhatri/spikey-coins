"use client";

import { useState } from "react";
import { Send, Sparkles, Paperclip, Mic, Loader2 } from "lucide-react";
import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

interface ChatMessage {
  role: "developer" | "user" | "assistant";
  content: string;
}

interface ChatInputProps {
  onResponse?: (message: string) => void;
}

export default function ChatInput({ onResponse }: ChatInputProps = {}) {
  const [message, setMessage] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      const currentMessage = message.trim();
      setIsLoading(true);
      setError(null);
      setResponse(null);

      try {
        const result = await axios.post(`${API_BASE_URL}/api/chat`, {
          message: currentMessage,
          conversationHistory: conversationHistory
        });

        if (result.data.success && result.data.data) {
          const responseMessage = result.data.data.message;
          setResponse(responseMessage);

          // Update conversation history
          const newHistory: ChatMessage[] = [
            ...conversationHistory,
            { role: "user", content: currentMessage },
            { role: "assistant", content: responseMessage }
          ];
          setConversationHistory(newHistory);

          if (onResponse) {
            onResponse(responseMessage);
          }
        }
        setMessage("");
      } catch (err) {
        console.error("Error sending message:", err);
        setError("Failed to get response. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-white via-white to-transparent pointer-events-none">
      <div className="max-w-4xl mx-auto pointer-events-auto">
        <form
          onSubmit={handleSubmit}
          className={`bg-white rounded-2xl border transition-all duration-200 ${
            isFocused ? "border-blue-400 shadow-lg" : "border-gray-300 shadow-md"
          }`}
        >
          <div className="flex items-center p-2">
            <button
              type="button"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="AI Assistant"
            >
              <Sparkles className="h-5 w-5 text-blue-500" />
            </button>
            
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Ask about crypto markets, get analysis, or search for tokens..."
              className="flex-1 px-3 py-2 outline-none text-gray-900 placeholder-gray-500"
            />
            
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Attach file"
              >
                <Paperclip className="h-5 w-5 text-gray-400" />
              </button>
              
              <button
                type="button"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Voice input"
              >
                <Mic className="h-5 w-5 text-gray-400" />
              </button>
              
              <button
                type="submit"
                disabled={!message.trim() || isLoading}
                className={`p-2 rounded-lg transition-colors ${
                  message.trim() && !isLoading
                    ? "bg-blue-500 hover:bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }`}
                aria-label="Send message"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
          
          {isFocused && (
            <div className="px-4 pb-2">
              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-colors"
                >
                  Price Analysis
                </button>
                <button
                  type="button"
                  className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-colors"
                >
                  Market Trends
                </button>
                <button
                  type="button"
                  className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-colors"
                >
                  Token Info
                </button>
                <button
                  type="button"
                  className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-colors"
                >
                  Portfolio Help
                </button>
              </div>
            </div>
          )}
        </form>

        {/* Response Display */}
        {(response || error) && (
          <div className="mt-4 p-4 bg-white rounded-xl border shadow-sm max-h-60 overflow-y-auto">
            {error ? (
              <div className="text-red-600">{error}</div>
            ) : (
              <div className="text-gray-800 whitespace-pre-wrap">{response}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}