import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Spikey Coins - Real-Time Cryptocurrency Market Data & Analysis",
    template: "%s | Spikey Coins",
  },
  description:
    "Track real-time cryptocurrency market data, analyze USDT trading pairs, and discover trending coins with Spikey Coins. Get live prices, 24h changes, volume data, and market insights.",
  keywords: [
    "cryptocurrency",
    "crypto market data",
    "real-time crypto prices",
    "USDT pairs",
    "crypto analysis",
    "cryptocurrency tracker",
    "bitcoin",
    "ethereum",
    "trading",
    "market cap",
    "volume analysis",
    "crypto trends",
  ],
  authors: [{ name: "Spikey Coins Team" }],
  creator: "Spikey Coins",
  publisher: "Spikey Coins",
  category: "Finance",
  classification: "Cryptocurrency Market Data",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://spikeycoins.com",
    title: "Spikey Coins - Real-Time Cryptocurrency Market Data",
    description:
      "Track real-time cryptocurrency market data, analyze USDT trading pairs, and discover trending coins with comprehensive market insights.",
    siteName: "Spikey Coins",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Spikey Coins - Cryptocurrency Market Tracker",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Spikey Coins - Real-Time Cryptocurrency Market Data",
    description:
      "Track real-time cryptocurrency market data and analyze USDT trading pairs with comprehensive market insights.",
    images: ["/og-image.png"],
    creator: "@spikeycoins",
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    google: "your-google-verification-code",
  },
  alternates: {
    canonical: "https://spikeycoins.com",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=5"
        />
      </head>
      <body className={`${inter.className} antialiased bg-white`}>
        {children}
      </body>
    </html>
  );
}
