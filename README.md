# BuyWell Multivendor Marketplace

India's multivendor marketplace built on Next.js 16.2.2.

- **Live**: [buywell.in](https://buywell.in)
- **Framework**: Next.js 16.2.2 (App Router, TypeScript)
- **DB**: PostgreSQL 17 (Drizzle ORM)
- **Cache**: Redis 7 (`bw:` key prefix)
- **Hosting**: Hetzner + Coolify (qbiqal-app-server)

## Local Development

```bash
cp .env.example .env.local
# fill in DATABASE_URL, REDIS_URL, JWT_SECRET, APP_URL

npm install
npm run db:migrate
npm run db:seed
npm run dev
```

## Scripts

```bash
npm run dev          # Next.js dev server (Turbopack)
npm run build        # Production build
npm run typecheck    # TypeScript check
npm run db:migrate   # Run Drizzle migrations
npm run db:seed      # Seed local database
npm run smoke        # Smoke tests
npm run e2e          # End-to-end tests
npm run verify       # build + smoke + e2e
```

## Documentation

- `docs/part1.md` — Multivendor conversion blueprint (Phase 0–7)
- `docs/part2.md` — BuyWell Global wallet integration blueprint
- `docs/roadmap.md` — Development tracker
- `docs/mind-map.md` — Platform architecture map
- `CLAUDE.md` — AI agent reference (project rules, file index, architecture)
