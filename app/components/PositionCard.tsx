import { getAccentColor } from "@/lib/trading/constants";

interface PositionCardProps {
  position: {
    id: string;
    contract: string;
    side: string;
    entryPrice: string;
    quantity: string;
    margin: string;
    collateralCurrency: string;
    leverage: string;
    liquidationPrice: string;
    realizedPnl: string;
    unrealizedPnl?: string;
    markPrice?: string;
    marginRatio?: string;
  };
  showCloseButton?: boolean;
}

export default function PositionCard({
  position,
  showCloseButton = true,
}: PositionCardProps) {
  const isLong = position.side === "long";
  const unrealizedPnl = parseFloat(position.unrealizedPnl ?? "0");
  const isProfitable = unrealizedPnl >= 0;
  const priceDecimals = position.contract === "XAG-PERP" ? 3 : 2;
  const accentColor = getAccentColor(position.contract);

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`rounded px-2 py-0.5 text-xs font-semibold uppercase ${
              isLong
                ? "bg-green-500/10 text-green-400"
                : "bg-red-500/10 text-red-400"
            }`}
          >
            {position.side}
          </span>
          <span className="text-sm font-medium text-white">
            {position.contract}
          </span>
          <span className="text-xs text-zinc-500">
            {parseFloat(position.leverage).toFixed(0)}x
          </span>
        </div>
        {showCloseButton && (
          <CloseButton positionId={position.id} />
        )}
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <dt className="text-zinc-500">Entry Price</dt>
          <dd className="font-mono text-white">
            ${parseFloat(position.entryPrice).toFixed(priceDecimals)}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Mark Price</dt>
          <dd className={`font-mono text-accent-${accentColor}`}>
            ${parseFloat(position.markPrice ?? "0").toFixed(priceDecimals)}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Quantity</dt>
          <dd className="font-mono text-white">
            {parseFloat(position.quantity).toFixed(2)} contracts
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Margin</dt>
          <dd className="font-mono text-white">
            ${parseFloat(position.margin).toFixed(2)} {position.collateralCurrency}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Unrealized PnL</dt>
          <dd
            className={`font-mono font-medium ${
              isProfitable ? "text-green-400" : "text-red-400"
            }`}
          >
            {isProfitable ? "+" : ""}${unrealizedPnl.toFixed(4)}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Liq. Price</dt>
          <dd className="font-mono text-red-400">
            ${parseFloat(position.liquidationPrice).toFixed(priceDecimals)}
          </dd>
        </div>
      </dl>
    </div>
  );
}

// Client wrapper for the close button
function CloseButton({ positionId }: { positionId: string }) {
  return (
    <form
      action={`/api/trading/positions/${positionId}/close`}
      method="POST"
    >
      <button
        type="button"
        className="rounded-lg border border-red-500/30 px-3 py-1 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10"
        data-position-id={positionId}
      >
        Close
      </button>
    </form>
  );
}
