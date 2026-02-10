export default function Footer() {
  return (
    <footer className="border-t border-border bg-surface py-12">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col items-center gap-6 text-center md:flex-row md:justify-between md:text-left">
          <div>
            <p className="text-lg font-bold text-white">
              <span className="text-gold">{"\u25C6"}</span> Spikey Coins
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              Crypto-powered commodities trading
            </p>
          </div>
          <div className="flex gap-6 text-sm text-zinc-500">
            <a href="#" className="transition-colors hover:text-white">
              Privacy Policy
            </a>
            <a href="#" className="transition-colors hover:text-white">
              Terms of Service
            </a>
            <a href="#" className="transition-colors hover:text-white">
              Contact
            </a>
          </div>
        </div>
        <div className="mt-8 border-t border-border pt-8 text-center text-xs text-zinc-600">
          &copy; 2026 Spikey Coins. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
