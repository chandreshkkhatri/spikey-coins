import Link from "next/link";

export default function DepositsWithdrawals() {
  return (
    <article className="prose prose-invert max-w-none prose-headings:text-white prose-a:text-gold hover:prose-a:text-gold-light">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">
        Using the Exchange
      </p>
      <h1>Deposits &amp; Withdrawals</h1>

      <p className="lead">
        Open Mandi has simple but deliberate rules for deposits and
        withdrawals. These limits are designed to keep the platform educational
        and low-risk while still giving you a realistic trading experience.
      </p>

      <h2>Accepted Currencies</h2>
      <p>Open Mandi accepts two stablecoins for deposits:</p>
      <ul>
        <li>
          <strong>USDT</strong> (Tether)
        </li>
        <li>
          <strong>USDC</strong> (USD Coin)
        </li>
      </ul>
      <p>
        No other cryptocurrencies or fiat currencies are accepted. Both USDT and
        USDC are stablecoins designed to maintain a 1:1 peg with the US dollar.
      </p>

      <h2>Deposit Rules</h2>
      <p>When depositing funds, two rules apply:</p>

      <h3>1. Maximum $5 Per Deposit</h3>
      <p>
        Each individual deposit can be a maximum of <strong>$5</strong> in value.
        You cannot deposit more than this in a single transaction.
      </p>

      <h3>2. Balance Must Be Below $1</h3>
      <p>
        You can only make a deposit when your total account balance (across both
        USDT and USDC) is <strong>less than $1</strong>. If your balance is $1 or
        more, the deposit button will be disabled.
      </p>

      <h3>Why These Limits?</h3>
      <p>These rules exist for good reasons:</p>
      <ul>
        <li>
          <strong>Educational focus</strong> &mdash; Open Mandi is an academic
          platform, not a commercial exchange. Small amounts keep the focus on
          learning rather than profit-seeking.
        </li>
        <li>
          <strong>Risk management</strong> &mdash; by keeping balances small, we
          protect users from significant financial loss while they&apos;re
          learning how exchanges work.
        </li>
        <li>
          <strong>Active participation</strong> &mdash; the low-balance
          requirement encourages you to actually trade with your funds rather
          than simply parking money on the platform.
        </li>
      </ul>

      <h2>Withdrawal Rules</h2>

      <h3>Minimum Balance of $10</h3>
      <p>
        To withdraw funds, your total account balance must be{" "}
        <strong>at least $10</strong>. This means you need to grow your balance
        through trading before you can withdraw.
      </p>

      <h3>Why This Threshold?</h3>
      <p>
        The $10 withdrawal minimum encourages meaningful engagement with the
        platform. Since you can only deposit up to $5 at a time, reaching $10
        requires you to either make profitable trades or accumulate funds over
        multiple deposit cycles. This ensures you&apos;re actually learning and
        participating, not just passing money through.
      </p>

      <h2>How It Works in Practice</h2>
      <p>Here&apos;s a typical flow:</p>
      <ol>
        <li>
          You start with a $0 balance and deposit $5 in USDT
        </li>
        <li>
          You trade gold futures, exchange some USDT for USDC, and explore the
          platform
        </li>
        <li>
          Your balance drops below $1 &mdash; you can deposit another $5
        </li>
        <li>
          Through trading, your balance grows to $10 or more
        </li>
        <li>
          Now you can withdraw some or all of your funds
        </li>
      </ol>

      <h2>Processing Times</h2>
      <p>
        Deposits are credited to your account as soon as the blockchain
        transaction is confirmed. Withdrawals are processed and sent to your
        specified wallet address after confirmation.
      </p>

      <h2>Frequently Asked Questions</h2>
      <h3>Can I deposit Bitcoin, Ethereum, or other cryptocurrencies?</h3>
      <p>
        No. Open Mandi only accepts USDT and USDC. You can convert other
        cryptocurrencies to USDT or USDC on an external exchange before
        depositing.
      </p>

      <h3>What happens if my balance is exactly $1?</h3>
      <p>
        If your balance is $1.00 or more, you cannot deposit. Your balance must
        be strictly below $1.00.
      </p>

      <h3>Can I withdraw part of my balance?</h3>
      <p>
        Yes, as long as your balance is $10 or more, you can withdraw any amount
        up to your available balance.
      </p>

      <h3>Where can I see the fee details?</h3>
      <p>
        Check our <Link href="/docs/fees">Fee Structure</Link> page for a
        complete breakdown of all fees.
      </p>
    </article>
  );
}
