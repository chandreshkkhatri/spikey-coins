"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Paperclip, Mic, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
  const [showResponse, setShowResponse] = useState(false);
  const responseBoxRef = useRef<HTMLDivElement>(null);
  const chatContentRef = useRef<HTMLDivElement>(null);

  // Handle click outside to collapse chat history
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (responseBoxRef.current && !responseBoxRef.current.contains(event.target as Node)) {
        // Check if click is not on the form either
        const form = document.querySelector('form');
        if (form && !form.contains(event.target as Node)) {
          setShowResponse(false);
        }
      }
    };

    if (showResponse) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showResponse]);

  // Auto-scroll to bottom when conversation history updates or when expanded
  useEffect(() => {
    if (showResponse && chatContentRef.current) {
      // Use setTimeout to ensure DOM has updated
      setTimeout(() => {
        if (chatContentRef.current) {
          chatContentRef.current.scrollTop = chatContentRef.current.scrollHeight;
        }
      }, 100);
    }
  }, [conversationHistory, showResponse, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      const currentMessage = message.trim();
      setIsLoading(true);
      setError(null);
      setMessage("");
      
      // Add user message to conversation history immediately
      const userMessage: ChatMessage = { role: "user", content: currentMessage };
      const updatedHistory = [...conversationHistory, userMessage];
      setConversationHistory(updatedHistory);
      setShowResponse(true);

      try {
        const result = await axios.post(`${API_BASE_URL}/api/chat`, {
          message: currentMessage,
          conversationHistory: conversationHistory
        });

        if (result.data.success && result.data.data) {
          const responseMessage = result.data.data.message;
          setResponse(responseMessage);

          // Add AI response to conversation history
          const assistantMessage: ChatMessage = { role: "assistant", content: responseMessage };
          setConversationHistory([...updatedHistory, assistantMessage]);

          if (onResponse) {
            onResponse(responseMessage);
          }
        }
      } catch (err) {
        console.error("Error sending message:", err);
        setError("Failed to get response. Please try again.");
        setShowResponse(true);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleCloseResponse = () => {
    setShowResponse(false);
  };

  const toggleResponse = () => {
    setShowResponse(!showResponse);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-white via-white to-transparent pointer-events-none">
      <div className="max-w-4xl mx-auto pointer-events-auto relative">
        {/* Response Display - Moved ABOVE input */}
        {(conversationHistory.length > 0 || error) && (
          <div className="mb-4">
            <div 
              ref={responseBoxRef}
              className={`bg-white rounded-xl border shadow-sm overflow-hidden ${
                showResponse ? 'max-h-96' : 'max-h-14'
              }`}
              style={{
                transition: 'max-height 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              {showResponse ? (
                <>
                  {/* Header with title and collapse button */}
                  <div 
                    className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50"
                    onMouseDown={(e) => {
                      // Prevent input blur when clicking on header (but not on buttons)
                      const target = e.target as HTMLElement;
                      if (!target.closest('button')) {
                        e.preventDefault();
                      }
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-purple-500" />
                      <span className="text-sm font-semibold text-gray-700">Chat History</span>
                      <span className="text-xs text-gray-500">
                        ({conversationHistory.length} message{conversationHistory.length !== 1 ? 's' : ''})
                      </span>
                    </div>
                    <button
                      onMouseDown={(e) => {
                        // Prevent input blur but allow button click
                        e.preventDefault();
                      }}
                      onClick={handleCloseResponse}
                      className="p-1.5 hover:bg-gray-200 rounded-full transition-all duration-200"
                      aria-label="Collapse chat"
                    >
                      <ChevronDown className="h-4 w-4 text-gray-600" />
                    </button>
                  </div>

                  {/* Chat content */}
                  <div 
                    ref={chatContentRef}
                    className="overflow-y-auto max-h-[calc(24rem-3.5rem)] p-4"
                    onMouseDown={(e) => {
                      // Prevent input blur when clicking on chat content
                      e.preventDefault();
                    }}
                  >
                    {error ? (
                      <div className="text-red-600">{error}</div>
                    ) : (
                      <div className="text-gray-800">
                        {/* Show conversation history */}
                        {conversationHistory.map((msg, idx) => (
                          <div key={idx} className="mb-4 last:mb-0">
                            <div className={`font-semibold text-xs mb-1 ${
                              msg.role === "user" ? "text-blue-600" : "text-purple-600"
                            }`}>
                              {msg.role === "user" ? "You" : "AI Assistant"}
                            </div>
                            <div className={`prose prose-sm max-w-none ${
                              msg.role === "user" ? "text-gray-700" : "text-gray-800"
                            }`}>
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {msg.content}
                              </ReactMarkdown>
                            </div>
                          </div>
                        ))}
                        
                        {/* Show loading indicator */}
                        {isLoading && (
                          <div className="mb-4">
                            <div className="font-semibold text-xs mb-1 text-purple-600">
                              AI Assistant
                            </div>
                            <div className="flex items-center gap-2 text-gray-500">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span className="text-sm">Thinking...</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div 
                  className="flex items-center justify-between px-4 py-3"
                  onMouseDown={(e) => {
                    // Prevent input blur when clicking on collapsed state (but not on buttons)
                    const target = e.target as HTMLElement;
                    if (!target.closest('button')) {
                      e.preventDefault();
                    }
                  }}
                >
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-4 w-4 text-purple-500" />
                    <span className="text-sm font-medium text-gray-700">Chat History</span>
                    <div className="h-4 w-px bg-gray-300"></div>
                    <span className="text-sm text-gray-500">
                      {conversationHistory.length} message{conversationHistory.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 hidden sm:block">Click to expand</span>
                    <button
                      onMouseDown={(e) => {
                        // Prevent input blur but allow button click
                        e.preventDefault();
                      }}
                      onClick={toggleResponse}
                      className="p-1.5 hover:bg-gray-100 rounded-full transition-all duration-200"
                      aria-label="Expand chat"
                    >
                      <ChevronUp className="h-4 w-4 text-gray-600" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

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
      </div>
    </div>
  );
}