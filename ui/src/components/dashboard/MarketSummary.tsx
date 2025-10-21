"use client";

import { useEffect, useState } from "react";
import { Clock, ExternalLink, TrendingUp, AlertCircle } from "lucide-react";
import { api } from "@/utils/api";

interface TrendingStory {
  _id?: string;
  id?: string;
  title: string;
  summary: string;
  source: string;
  time?: string;
  timestamp?: string;
  createdAt?: string;
  impact: "high" | "medium" | "low";
  category: string;
  url?: string;
  coinSymbol?: string;
  priceChange?: number;
  timeframe?: string;
}

interface SummaryData {
  _id?: string;
  id?: string;
  title?: string;
  summary?: string;
  source?: string;
  time?: string;
  timestamp?: string;
  createdAt?: string;
  impact?: string;
  category?: string;
  url?: string;
  coinSymbol?: string;
  priceChange?: number;
  timeframe?: string;
}

export default function MarketSummary() {
  const [stories, setStories] = useState<TrendingStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatTimeAgo = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (minutes > 0) {
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  };

  useEffect(() => {
    const fetchSummaries = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await api.getSummaries();
        const summariesData = response.data?.data || response.data || [];

        const formattedStories = summariesData.slice(0, 10).map((story: SummaryData): TrendingStory => ({
          _id: story._id,
          id: story._id || story.id || Math.random().toString(36).substring(2, 11),
          title: story.title || 'Untitled',
          summary: story.summary || 'No summary available',
          source: story.source || 'Research',
          time: story.time || (story.timestamp || story.createdAt ? formatTimeAgo(story.timestamp || story.createdAt || '') : 'Recently'),
          timestamp: story.timestamp,
          createdAt: story.createdAt,
          impact: (story.impact as "high" | "medium" | "low") || 'medium',
          category: story.category || 'General',
          url: story.url,
          coinSymbol: story.coinSymbol,
          priceChange: story.priceChange,
          timeframe: story.timeframe,
        }));
        
        setStories(formattedStories);
      } catch (err) {
        console.error("Error fetching summaries:", err);
        setError("Failed to load market summaries");
      } finally {
        setLoading(false);
      }
    };

    fetchSummaries();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Market Summary</h2>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <TrendingUp className="h-4 w-4" />
            <span>Top Stories</span>
          </div>
        </div>
        
        <div className="space-y-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="p-3 bg-gray-50 rounded-lg animate-pulse">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-4 bg-gray-200 rounded w-16"></div>
                <div className="h-4 bg-gray-200 rounded w-12"></div>
              </div>
              <div className="h-5 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="flex items-center gap-3">
                <div className="h-3 bg-gray-200 rounded w-16"></div>
                <div className="h-3 bg-gray-200 rounded w-20"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || stories.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Market Summary</h2>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <TrendingUp className="h-4 w-4" />
            <span>Top Stories</span>
          </div>
        </div>
        <div className="flex items-center justify-center py-8 text-gray-500">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm">{error || "No market summaries available yet"}</p>
          </div>
        </div>
      </div>
    );
  }
  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "high":
        return "bg-red-100 text-red-700 border-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "low":
        return "bg-green-100 text-green-700 border-green-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Market Summary</h2>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <TrendingUp className="h-4 w-4" />
          <span>Top Stories</span>
        </div>
      </div>
      
      <div className="space-y-3">
        {stories.map((story) => (
          <div
            key={story.id || story._id}
            className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer group"
            onClick={() => story.url && window.open(story.url, '_blank')}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {story.coinSymbol && (
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                      {story.coinSymbol}
                    </span>
                  )}
                  {story.priceChange !== undefined && (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                      story.priceChange > 0 ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'
                    }`}>
                      {story.priceChange > 0 ? '+' : ''}{story.priceChange.toFixed(2)}%
                    </span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${getImpactColor(story.impact)}`}>
                    {story.impact.toUpperCase()}
                  </span>
                  <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                    {story.category}
                  </span>
                </div>
                <h3 className="font-medium text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                  {story.title}
                </h3>
                <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                  {story.summary}
                </p>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {story.time}
                  </span>
                  {story.timeframe && (
                    <span className="font-medium">{story.timeframe} change</span>
                  )}
                </div>
              </div>
              {story.url && (
                <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-blue-600 transition-colors flex-shrink-0 mt-1" />
              )}
            </div>
          </div>
        ))}
      </div>
      
      <button className="w-full mt-3 py-2 text-sm text-blue-600 hover:text-blue-700 font-medium hover:bg-blue-50 rounded-lg transition-colors">
        View All Stories →
      </button>
    </div>
  );
}