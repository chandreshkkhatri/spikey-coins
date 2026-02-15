export default function StablecoinExchange() {
  return (
    <article className="prose prose-invert max-w-none prose-headings:text-white prose-a:text-gold hover:prose-a:text-gold-light">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">
        Using the Exchange
      </p>
      <h1>USDT / USDC Stablecoin Exchange</h1>

      <p className="lead">
        Open Mandi includes a built-in exchange where you can swap between USDT
        and USDC. Unlike most exchanges that fix the rate at 1:1, our rate is
        determined by the free market &mdash; by the actual buying and selling
        activity of traders on the platform.
      </p>

      <h2>What is the Stablecoin Exchange?</h2>
      <p>
        The stablecoin exchange is a marketplace within Open Mandi where you
        can trade USDT for USDC and vice versa. It has its own order book, just
        like the gold and silver futures markets.
      </p>
      <p>
        This means the price you get depends on what other traders are offering.
        It&apos;s a real market with real price discovery, even for two
        currencies that are both designed to be worth $1.
      </p>

      <h2>Why Exchange Between USDT and USDC?</h2>
      <p>There are several reasons you might want to swap stablecoins:</p>
      <ul>
        <li>
          You deposited USDT but a futures market you want to trade requires USDC
          as margin, or vice versa
        </li>
        <li>
          You want to take advantage of a price difference between the two
        </li>
        <li>
          You want to diversify your holdings across both stablecoins
        </li>
        <li>
          You want to learn how order books and market-driven pricing work in a
          low-stakes environment
        </li>
      </ul>

      <h2>How the Exchange Rate is Determined</h2>
      <p>
        The exchange rate between USDT and USDC on Open Mandi is{" "}
        <strong>not fixed</strong>. It&apos;s determined entirely by supply and
        demand through the order book.
      </p>
      <p>Here&apos;s a simplified example:</p>
      <ul>
        <li>
          Alice wants to sell 1 USDT for 1.002 USDC (she&apos;s asking for
          slightly more than 1:1)
        </li>
        <li>
          Bob wants to buy 1 USDT for 0.998 USDC (he&apos;s offering slightly
          less than 1:1)
        </li>
        <li>
          The spread (gap) between the best ask and best bid is 0.004 USDC
        </li>
        <li>
          When someone places a market order, they&apos;ll be matched with the
          best available price on the other side
        </li>
      </ul>

      <h2>Understanding the Order Book</h2>
      <p>The order book shows two sides:</p>
      <ul>
        <li>
          <strong>Bids (buy orders)</strong> &mdash; people who want to buy USDT
          with USDC. These are sorted from highest to lowest price. The highest
          bid is what buyers are currently willing to pay.
        </li>
        <li>
          <strong>Asks (sell orders)</strong> &mdash; people who want to sell USDT
          for USDC. These are sorted from lowest to highest price. The lowest ask
          is the cheapest price available.
        </li>
      </ul>
      <p>
        The <strong>mid-market price</strong> is the average of the best bid and
        best ask. This is often used as a reference for the &quot;current&quot;
        exchange rate.
      </p>

      <h2>Placing an Exchange Order</h2>
      <p>You have two options when exchanging stablecoins:</p>
      <ul>
        <li>
          <strong>Limit order</strong> &mdash; you specify the exact rate you
          want. Your order sits on the order book until someone matches it. You
          might get a better rate but it might take longer (or never fill if your
          price is too far from the market).
        </li>
        <li>
          <strong>Market order</strong> &mdash; you accept the best available
          rate right now. Your order is filled immediately at whatever price is
          available on the other side of the book.
        </li>
      </ul>

      <h2>Why Rates May Differ from 1:1</h2>
      <p>
        Even though both USDT and USDC are designed to be worth $1, their
        exchange rate on Open Mandi can deviate from 1:1 for several reasons:
      </p>
      <ul>
        <li>
          <strong>Supply and demand</strong> &mdash; if more people want to sell
          USDT than buy it, the price drops below 1:1
        </li>
        <li>
          <strong>Liquidity</strong> &mdash; with a smaller number of
          participants (as on an academic exchange), prices can be more volatile
        </li>
        <li>
          <strong>Market sentiment</strong> &mdash; traders&apos; preferences
          between the two stablecoins can shift the rate
        </li>
      </ul>
      <p>
        This is actually one of the most interesting educational aspects of Spikey
        Coins &mdash; you get to see firsthand how market dynamics affect price,
        even for assets that should theoretically be identical in value.
      </p>
    </article>
  );
}
