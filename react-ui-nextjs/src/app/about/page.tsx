import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Spikey Coins - Real-Time Cryptocurrency Market Data Platform",
  description:
    "Learn about Spikey Coins, the comprehensive cryptocurrency market data platform providing real-time prices, analysis, and insights for USDT trading pairs.",
  openGraph: {
    title: "About Spikey Coins - Real-Time Cryptocurrency Market Data Platform",
    description:
      "Learn about Spikey Coins, the comprehensive cryptocurrency market data platform providing real-time prices, analysis, and insights for USDT trading pairs.",
    url: "https://spikeycoins.com/about",
    type: "website",
  },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white py-12">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">
          About Spikey Coins
        </h1>

        <div className="prose prose-lg max-w-none">
          <p className="text-xl text-gray-600 mb-8">
            Spikey Coins is a comprehensive cryptocurrency market data platform
            designed to provide traders and investors with real-time insights
            into the crypto market.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
            Our Mission
          </h2>
          <p className="text-gray-700 mb-6">
            We aim to democratize access to professional-grade cryptocurrency
            market data, making it easier for everyone to make informed trading
            decisions.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
            Features
          </h2>
          <ul className="list-disc pl-6 text-gray-700 space-y-2">
            <li>Real-time cryptocurrency price tracking</li>
            <li>24-hour price change analysis</li>
            <li>Volume and market cap data</li>
            <li>USDT trading pair focus</li>
            <li>Market trend identification</li>
            <li>User-friendly interface</li>
          </ul>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
            Why Choose Spikey Coins?
          </h2>
          <p className="text-gray-700 mb-6">
            Our platform combines accuracy, speed, and simplicity to deliver the
            market insights you need. Whether you&apos;re a seasoned trader or
            just starting your crypto journey, Spikey Coins provides the tools
            and data to help you succeed.
          </p>
        </div>
      </div>
    </div>
  );
}
