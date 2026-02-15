import type { AccentColor } from "@/lib/trading/constants";

interface PriceDisplayProps {
  indexPrice: string;
  markPrice: string;
  fundingRate: string;
  nextFundingAt: string;
  contract: string;
  accentColor?: AccentColor;
}

export default function PriceDisplay({
  indexPrice,
  markPrice,
  fundingRate,
  nextFundingAt,
  contract,
  accentColor = "gold",
}: PriceDisplayProps) {
  const rate = parseFloat(fundingRate);
  const ratePercent = (rate * 100).toFixed(4);
  const isPositive = rate > 0;

  const nextFunding = new Date(nextFundingAt);
  const now = new Date();
  const diffMs = nextFunding.getTime() - now.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const countdown = diffMs > 0 ? `${hours}h ${minutes}m` : "Now";

  const priceDecimals = contract === "XAG-PERP" ? 3 : 2;

  return (
    <div className="flex flex-wrap items-center gap-6 rounded-2xl border border-border bg-surface px-6 py-3">
      <div>
        <span className="text-xs text-zinc-500">Index</span>
        <p className="font-mono text-sm font-medium text-white">
          ${parseFloat(indexPrice).toFixed(priceDecimals)}
        </p>
      </div>
      <div>
        <span className="text-xs text-zinc-500">Mark</span>
        <p className={`font-mono text-sm font-medium text-accent-${accentColor}`}>
          ${parseFloat(markPrice).toFixed(priceDecimals)}
        </p>
      </div>
      <div>
        <span className="text-xs text-zinc-500">Funding</span>
        <p
          className={`font-mono text-sm font-medium ${
            isPositive ? "text-red-400" : rate < 0 ? "text-green-400" : "text-zinc-400"
          }`}
        >
          {isPositive ? "+" : ""}
          {ratePercent}%
        </p>
      </div>
      <div>
        <span className="text-xs text-zinc-500">Next Funding</span>
        <p className="font-mono text-sm text-zinc-300">{countdown}</p>
      </div>
    </div>
  );
}
