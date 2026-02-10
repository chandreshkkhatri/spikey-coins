import Link from "next/link";

export default function Transparency() {
  return (
    <article className="prose prose-invert max-w-none prose-headings:text-white prose-a:text-gold hover:prose-a:text-gold-light">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">
        Using the Exchange
      </p>
      <h1>Transparency at Spikey Coins</h1>

      <p className="lead">
        Most exchanges keep their inner workings private. Spikey Coins does the
        opposite. As an academic platform, we believe in full transparency
        &mdash; you can see exactly how the exchange operates, how much revenue
        it generates, and what&apos;s happening across the entire platform.
      </p>

      <h2>Our Commitment to Transparency</h2>
      <p>
        Spikey Coins publishes real-time and historical data about its
        operations. This isn&apos;t just a marketing claim &mdash; it&apos;s
        built into the platform as a core feature. The Transparency Dashboard is
        available to everyone, even without an account.
      </p>

      <h2>What Data is Public?</h2>
      <p>
        The Transparency Dashboard displays the following information in real
        time:
      </p>
      <ul>
        <li>
          <strong>Total registered users</strong> &mdash; how many people have
          accounts on the platform (no personal information is revealed)
        </li>
        <li>
          <strong>Trading volume</strong> &mdash; total value of trades executed,
          broken down by market (gold futures, silver futures, USDT/USDC
          exchange)
        </li>
        <li>
          <strong>Fees collected</strong> &mdash; total revenue earned by the
          exchange from maker fees, taker fees, and withdrawal fees
        </li>
        <li>
          <strong>Current exchange rates</strong> &mdash; the live USDT/USDC
          exchange rate, including bid, ask, and mid-market price
        </li>
        <li>
          <strong>Open interest</strong> &mdash; total number of open futures
          positions across gold and silver markets
        </li>
        <li>
          <strong>Deposit and withdrawal volume</strong> &mdash; total funds
          flowing in and out of the platform
        </li>
      </ul>

      <h2>How to Read the Transparency Dashboard</h2>
      <p>The dashboard is organized into sections:</p>
      <ul>
        <li>
          <strong>Summary cards</strong> at the top show key metrics at a glance:
          total users, 24-hour volume, total fees collected, and the current
          USDT/USDC rate
        </li>
        <li>
          <strong>Volume charts</strong> show trading activity over time, so you
          can see trends and patterns
        </li>
        <li>
          <strong>Fee breakdown</strong> shows exactly how much revenue each fee
          type generates
        </li>
        <li>
          <strong>Market data</strong> shows depth and activity for each trading
          pair
        </li>
      </ul>

      <h2>Privacy and Anonymization</h2>
      <p>
        Transparency doesn&apos;t mean exposing personal information. All data
        on the Transparency Dashboard is <strong>anonymized</strong>:
      </p>
      <ul>
        <li>User counts are aggregate numbers, not individual profiles</li>
        <li>
          Trading volumes are totals, not tied to specific accounts
        </li>
        <li>No email addresses, wallet addresses, or personal data is shown</li>
      </ul>

      <h2>Academic Research Use</h2>
      <p>
        The transparency data is ideal for academic research. Students and
        researchers can study real market dynamics, including:
      </p>
      <ul>
        <li>How order books form and evolve</li>
        <li>The relationship between trading volume and price movement</li>
        <li>How fees affect trading behavior</li>
        <li>Price discovery in thin markets</li>
        <li>The economics of running an exchange</li>
      </ul>
      <p>
        Visit the{" "}
        <Link href="/exchange/transparency">Transparency Dashboard</Link> to
        explore the data yourself.
      </p>
    </article>
  );
}
