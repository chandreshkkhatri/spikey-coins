# Spikey Coins Roadmap

An academic cryptocurrency-based commodities exchange for trading gold and silver futures with stablecoin settlement.

## Progress Summary

| Sprint | Status | Routes | Key Deliverables |
|--------|--------|--------|-----------------|
| 0 — Documentation + Placeholders | Done | 31 | Next.js scaffold, 5 route groups, 17 doc pages, dark theme |
| 1 — Auth & User Accounts | Done | 38 | Firebase Auth, sessions, users/wallets tables |
| 2 — Wallet, Deposits & Withdrawals | Done | 40 | USDT/USDC deposits, withdrawals, transactions |
| 3 — Trading Engine | Done | 47 | 3 order books, matching, futures, margin, liquidation |
| 4 — Transparency + Liquidity | Done | 47 | Transparency dashboard, one-click LP, zero maker fees |
| 5 — System Market Maker | Planned | — | Automated baseline liquidity bot |

## Completed Sprints

### Sprint 0: Documentation + Placeholders
- Project scaffolding with Next.js 16, React 19, Tailwind CSS 4
- 5 route groups: (marketing), (docs), (exchange), (legal), (auth)
- 14 documentation pages + 7 technical docs
- Dark theme with gold (#F5A623) / silver (#C0C0C0) palette
- ComingSoon component for unbuilt features

### Sprint 1: Auth & User Accounts
- Firebase Auth integration (Google sign-in)
- PostgreSQL + Drizzle ORM for users/wallets tables
- httpOnly session cookies (5-day expiry)
- Protected exchange layout with session verification
- Build-safe lazy initialization for Firebase/DB

### Sprint 2: Wallet, Deposits & Withdrawals
- Deposit flow: USDT/USDC, max $20 per deposit, only when balance < $5
- Withdrawal flow: only when balance >= $10, $0.10 flat fee
- Transactions table with signed amounts and balance snapshots
- Server+client hybrid pattern for forms

### Sprint 3: Trading Engine
- 3 order books: USDT-USDC (spot), XAU-PERP (gold futures), XAG-PERP (silver futures)
- Synchronous order matching with price-time priority and partial fills
- Perpetual futures: up to 50x leverage, 2% initial margin, 1% maintenance margin
- Mark price: 70% index (metals.dev API) + 30% order book mid
- Funding rates: 8-hour intervals (00/08/16 UTC), clamped +/-1%
- Liquidation engine for under-margined positions
- Live gold/silver prices from metals.dev (30-min cache, 100 req/month free tier)

### Sprint 4: Transparency + Liquidity
- Transparency dashboard with public exchange statistics
- One-click liquidity provision ("Provide Liquidity" feature)
- Zero maker fees to incentivize limit order placement
- Increased deposit limits ($5 -> $20 max, $1 -> $5 threshold)
- Lowered spot minimum order size (0.01 -> 0.001)
- Project roadmap (this file)

### Infrastructure
- Vercel deployment with Vercel Postgres (Neon serverless)
- `@neondatabase/serverless` driver with WebSocket connections
- 6 database tables with indexes for query performance

## Backlog / Future Sprints

### Sprint 5: System Market Maker (Planned)

**Problem**: With few users in an academic setting, order books will be empty and no trades can happen. While Sprint 4's LP feature lets users manually provide liquidity, a system-level solution ensures baseline liquidity at all times.

**Proposed Solution**: Market Maker Bot
- System/house account that provides baseline liquidity
- Places limit orders on both sides of each order book
- Configurable spread around the index price (e.g., +/- 0.1%)
- Configurable order sizes and refresh interval
- Self-trade prevention already built into matching engine
- Runs as a cron endpoint or background job

### Sprint 6+: Potential Features
- [ ] Real-time WebSocket price updates
- [ ] Trade notifications (email or in-app)
- [ ] Leaderboard / PnL rankings
- [ ] Portfolio analytics and charts
- [ ] Admin dashboard
- [ ] Mobile-responsive improvements
- [ ] API rate limiting
- [ ] Automated testing suite
