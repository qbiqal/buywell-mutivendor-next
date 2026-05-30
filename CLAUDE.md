# APRAS Naturals — AI Agent Reference

> Framework: Next.js 16.2.2 · DB: PostgreSQL 17 · Cache: Redis 7 (an: prefix)
> Authorized Prakvedaa Partner — Honey + A2 Ghee E-Commerce

---

## STRICT RULES

**1. Git commits — ALWAYS use "Qbiqal"**
All commits: `Qbiqal <qbiqal.official@gmail.com>`. Never AI names.

**2. NO external UI libraries**
No shadcn, no Radix UI, no Tailwind UI. Pure CSS variables + CSS Modules.

**3. Config from DB first, env as fallback**
Use `getSiteConfig(key)` from `src/lib/config.ts`. `.env` is fallback only.

**4. Payment gateway is pluggable**
Use `src/lib/payment/` abstraction. Offline QR is gateway #1.

**5. Redis namespace: an:**
All keys use `ioredis` with `keyPrefix: "an:"`. Never bare keys.

**6. No PgBouncer currently — direct PG :5432**
Code must be PgBouncer-compatible (no PREPARE, no cross-request SET transactions).

---

## Stack
Next.js 16.2.2 · TypeScript · Custom CSS · Drizzle ORM · Redis 7 · JWT (jose)

## Portals
- Customer portal: top nav (StockSense member layout)
- Admin panel: left sidebar (StockSense admin layout)

## Infrastructure
- App: 178.104.105.31 (Docker via Coolify)
- PG: 178.104.158.232:5432 → apras_naturals_db
- Redis: 178.104.158.112:6379 → an: prefix
- Coolify: 178.104.149.128:8000

## Commands
```bash
npm run dev           # Dev (Turbopack)
npm run build         # Production build
npm run db:generate   # Schema → migration
npm run db:push       # Push schema (dev)
npm run db:seed       # Seed defaults
npm run db:indexes    # Performance indexes
```
