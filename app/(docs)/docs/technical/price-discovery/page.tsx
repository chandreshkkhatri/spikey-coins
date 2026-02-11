export default function PriceDiscovery() {
  return (
    <article className="prose prose-invert max-w-none prose-headings:text-white prose-a:text-gold hover:prose-a:text-gold-light">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">
        Technical Documentation
      </p>
      <h1>USDT/USDC Price Discovery Mechanism</h1>

      <p className="lead">
        The USDT/USDC exchange on Spikey Coins operates as a free market with no
        administered or pegged rate. The exchange rate is determined entirely by
        the interaction of buy and sell orders on the order book.
      </p>

      <h2>Free Market Principle</h2>
      <p>
        Unlike centralized stablecoin swaps that enforce a 1:1 rate (or apply a
        fixed spread), Spikey Coins treats USDT and USDC as two distinct assets
        with independent valuations on the platform. The exchange rate emerges
        from the collective decisions of participants.
      </p>
      <p>
        This design serves an educational purpose: it demonstrates that even
        assets with near-identical external valuations can exhibit price
        divergence in a closed market with limited liquidity.
      </p>

      <h2>Order Book Structure</h2>
      <p>
        The USDT/USDC pair uses the same order book architecture as the futures
        markets. The base currency is USDT and the quote currency is USDC:
      </p>
      <ul>
        <li>
          <strong>Bid side</strong> &mdash; buy orders for USDT, priced in USDC.
          A bid of 1.001 means &quot;I will pay 1.001 USDC per 1 USDT.&quot;
        </li>
        <li>
          <strong>Ask side</strong> &mdash; sell orders for USDT, priced in USDC.
          An ask of 1.003 means &quot;I will sell 1 USDT for 1.003 USDC.&quot;
        </li>
      </ul>

      <h2>Mid-Market Price Calculation</h2>
      <p>
        The mid-market price is calculated as the arithmetic mean of the best
        bid and best ask:
      </p>
      <pre>
        <code>{`midPrice = (bestBid + bestAsk) / 2

Example:
  bestBid = 0.999 USDC
  bestAsk = 1.001 USDC
  midPrice = (0.999 + 1.001) / 2 = 1.000 USDC`}</code>
      </pre>
      <p>
        The mid-market price is used as the reference rate for display purposes
        on the Transparency Dashboard and for cross-currency valuation (e.g.,
        calculating total portfolio value in USD terms).
      </p>

      <h2>Spread Dynamics and Liquidity</h2>
      <p>
        The <strong>spread</strong> is the difference between the best ask and
        the best bid:
      </p>
      <pre>
        <code>{`spread = bestAsk - bestBid
spreadPercent = (spread / midPrice) * 100`}</code>
      </pre>
      <p>Key dynamics on the Spikey Coins USDT/USDC market:</p>
      <ul>
        <li>
          <strong>Thin liquidity</strong> &mdash; with strict deposit limits and
          a small user base, the order book will typically be thin, leading to
          wider spreads than external markets
        </li>
        <li>
          <strong>Spread as opportunity</strong> &mdash; wide spreads create
          arbitrage incentives for participants to place tighter limit orders,
          which in turn improves liquidity
        </li>
        <li>
          <strong>Maker fee incentive</strong> &mdash; the lower maker fee
          (0.01% vs. 0.03% taker) encourages limit order placement, which builds
          order book depth
        </li>
      </ul>

      <h2>Edge Cases</h2>
      <h3>Empty Order Book</h3>
      <p>
        When one or both sides of the order book are empty, the mid-market price
        is undefined. Market orders on the empty side will be rejected. Limit
        orders can still be placed and will rest until a counterparty arrives.
      </p>

      <h3>Extreme Imbalance</h3>
      <p>
        If the bid-ask spread exceeds a configurable threshold (e.g., 5%), the
        system may display a warning to users that the market is illiquid.
        Trading remains permitted &mdash; the warning is informational only.
      </p>

      <h3>Self-Trading Prevention</h3>
      <p>
        A user&apos;s buy order cannot match against their own sell order. The
        matching engine skips self-matches and continues to the next order in
        the queue.
      </p>

      <h2>Comparison to External Markets</h2>
      <p>
        On major centralized exchanges, the USDT/USDC rate typically remains
        within 0.01-0.05% of 1:1. On Spikey Coins, deviations may be larger
        due to:
      </p>
      <ul>
        <li>Smaller participant pool</li>
        <li>No market makers or automated liquidity providers</li>
        <li>Deposit limits constraining available capital</li>
        <li>No external arbitrage bots maintaining the peg</li>
      </ul>
      <p>
        These deviations are a feature, not a bug &mdash; they provide real
        examples of market microstructure phenomena for study.
      </p>
    </article>
  );
}
