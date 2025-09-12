"use client";

import { Clock, ExternalLink, TrendingUp } from "lucide-react";

interface TrendingStory {
  id: string;
  title: string;
  summary: string;
  source: string;
  time: string;
  impact: "high" | "medium" | "low";
  category: string;
}

const dummyStories: TrendingStory[] = [
  {
    id: "1",
    title: "Bitcoin ETF Sees Record Inflows of $500M in Single Day",
    summary: "Institutional investors continue to pour money into Bitcoin ETFs, signaling strong confidence in cryptocurrency markets.",
    source: "CoinDesk",
    time: "2 hours ago",
    impact: "high",
    category: "Bitcoin"
  },
  {
    id: "2",
    title: "Ethereum's Dencun Upgrade Successfully Deployed on Mainnet",
    summary: "The much-anticipated upgrade brings significant improvements to layer-2 scaling solutions and reduces transaction costs.",
    source: "The Block",
    time: "5 hours ago",
    impact: "high",
    category: "Ethereum"
  },
  {
    id: "3",
    title: "Solana Network Achieves 5000 TPS Milestone",
    summary: "Solana demonstrates its high-performance capabilities with record transaction throughput during peak trading hours.",
    source: "Decrypt",
    time: "8 hours ago",
    impact: "medium",
    category: "Solana"
  },
  {
    id: "4",
    title: "DeFi Total Value Locked Surpasses $50 Billion",
    summary: "Decentralized finance protocols see renewed interest as TVL reaches highest levels since 2022.",
    source: "DeFi Pulse",
    time: "12 hours ago",
    impact: "medium",
    category: "DeFi"
  },
  {
    id: "5",
    title: "Major Exchange Lists New AI-Focused Cryptocurrency",
    summary: "Binance announces listing of AI token, leading to 40% price surge in pre-market trading.",
    source: "Binance News",
    time: "1 day ago",
    impact: "low",
    category: "Altcoins"
  },
];

export default function MarketSummary() {
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
        {dummyStories.map((story) => (
          <div
            key={story.id}
            className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer group"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
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
                  <span className="font-medium">{story.source}</span>
                </div>
              </div>
              <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-blue-600 transition-colors flex-shrink-0 mt-1" />
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