import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "./App.css";
import "./colors.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Spikey Coins - Cryptocurrency Market Tracker",
  description:
    "Real-time cryptocurrency market data and analysis for USDT trading pairs",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        {children}
      </body>
    </html>
  );
}
