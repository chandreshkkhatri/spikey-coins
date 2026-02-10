import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Spikey Coins | Crypto-Powered Gold & Silver Futures Exchange",
  description:
    "Trade gold and silver futures using cryptocurrency. Spikey Coins is a next-generation commodities exchange bridging digital assets and precious metals markets.",
  keywords: [
    "cryptocurrency",
    "gold futures",
    "silver futures",
    "commodities exchange",
    "crypto trading",
    "precious metals",
    "digital assets",
  ],
  openGraph: {
    title: "Spikey Coins | Crypto-Powered Gold & Silver Futures Exchange",
    description:
      "Trade gold and silver futures using cryptocurrency. A next-generation commodities exchange bridging digital assets and precious metals.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
