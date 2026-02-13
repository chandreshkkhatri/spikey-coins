"use client";

import { useState } from "react";
import OrderForm from "./OrderForm";
import LPForm from "./LPForm";

interface TradingFormTabsProps {
  pair: string;
  pairType: "spot" | "futures";
  minQuantity: string;
  tickSize: string;
  usdtAvailable: number;
  usdcAvailable: number;
  currentPrice: string;
  contractSize?: string;
  maxLeverage?: number;
  initialMarginRate?: string;
}

export default function TradingFormTabs(props: TradingFormTabsProps) {
  const [tab, setTab] = useState<"trade" | "lp">("trade");

  return (
    <div>
      <div className="mb-4 flex gap-2">
        {(
          [
            { key: "trade", label: "Trade" },
            { key: "lp", label: "Provide Liquidity" },
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
              tab === key
                ? "border-gold bg-gold/10 text-gold"
                : "border-border text-zinc-400 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "trade" ? (
        <OrderForm {...props} />
      ) : (
        <LPForm {...props} />
      )}
    </div>
  );
}
