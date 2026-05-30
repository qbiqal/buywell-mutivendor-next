# APRAS Naturals — Development Blueprint Part 3
## CI/CD, Deployment, Phase Roadmap & Production Checklist

> Covers: GitHub repo setup, Coolify CI/CD, PG/Redis setup, Dockerfile, Startup script, Phase-by-phase development plan.

---

## 1. GITHUB REPO SETUP

### Step 1: Create Repository

```bash
# Login: gh auth login
gh repo create qbiqal/apras-naturals \
  --private \
  --description "APRAS Naturals — CMS + E-Commerce + Blog Platform" \
  --clone

cd apras-naturals
```

### Step 2: Initialize Next.js 16.2.2

```bash
npx create-next-app@16.2.2 . \
  --typescript \
  --app \
  --no-tailwind \
  --src-dir \
  --no-eslint \
  --no-import-alias
```

### Step 3: Install Dependencies

```bash
# Core
npm install drizzle-orm pg @types/pg ioredis jose bcryptjs

# Forms / UI helpers
npm install framer-motion @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities react-image-crop

# Media
npm install sharp multer @types/multer

# Notifications
npm install nodemailer resend @types/nodemailer

# Monitoring
npm install @sentry/nextjs

# Utilities
npm install cuid2 date-fns slugify

# Dev
npm install -D drizzle-kit tsx @types/bcryptjs @types/node
```

### Step 4: Create Essential Config Files

```typescript
// drizzle.config.ts
import { defineConfig } from "drizzle-kit";
export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./src/lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

```json
// package.json scripts
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "node server.js",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:seed": "tsx src/lib/db/seed.ts",
    "db:indexes": "tsx src/lib/db/indexes.ts",
    "db:studio": "drizzle-kit studio"
  }
}
```

```typescript
// next.config.ts
import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  output: "standalone",
  experimental: { turbopack: true },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.r2.cloudflarestorage.com" },
    ],
  },
};
export default nextConfig;
```

---

## 2. POSTGRESQL DATABASE SETUP

SSH into PG server and run:

```bash
ssh -i ~/.ssh/qbiqal_hetzner root@178.104.158.232

sudo -u postgres psql
```

```sql
-- Create user and database
CREATE USER apras_user WITH PASSWORD 'GENERATE_STRONG_PASSWORD';
CREATE DATABASE apras_naturals_db OWNER apras_user;
GRANT ALL PRIVILEGES ON DATABASE apras_naturals_db TO apras_user;
\c apras_naturals_db
GRANT ALL ON SCHEMA public TO apras_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO apras_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO apras_user;
\q
```

### Add to PgBouncer

```bash
# Get password hash
sudo -u postgres psql -c "SELECT concat('\"', usename, '\" \"', passwd, '\"') FROM pg_shadow WHERE usename = 'apras_user';"

# Add to userlist
sudo nano /etc/pgbouncer/userlist.txt
# Append the output line

# Add to pgbouncer.ini [databases] section
sudo nano /etc/pgbouncer/pgbouncer.ini
# Add: apras_naturals_db = host=127.0.0.1 port=5432 dbname=apras_naturals_db

# Reload pgbouncer
sudo systemctl reload pgbouncer

# Verify from app server
psql -h 178.104.158.232 -p 6432 -U apras_user -d apras_naturals_db -c "SELECT 1;"
```

---

## 3. REDIS NAMESPACE

No additional config needed. The app uses `ioredis` with `keyPrefix: "an:"` for automatic isolation.

```typescript
// src/lib/redis.ts
import Redis from "ioredis";

export const redis = new Redis(process.env.REDIS_URL!, {
  keyPrefix: "an:",
  maxRetriesPerRequest: 3,
  enableReadyCheck: false,
  lazyConnect: true,
});
```

Verify from app server:
```bash
redis-cli -h 178.104.158.112 -p 6379 -a PASSWORD ping
# → PONG
```

---

## 4. DOCKERFILE (Multi-Stage — Same Pattern as StockSense)

```dockerfile
# Dockerfile

# ── Stage 1: base ──────────────────────────────
FROM node:24-alpine AS base
RUN apk add --no-cache libc6-compat

# ── Stage 2: deps ──────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ── Stage 3: builder ───────────────────────────
FROM base AS builder
WORKDIR /app

ARG NEXT_PUBLIC_APP_URL=https://aprasnaturals.com
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=3072"

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate any pending Drizzle migrations (reads schema.ts only — no real DB)
RUN DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder \
    npm run db:generate 2>/dev/null || true

RUN npm run build

# ── Stage 4: runner ────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--no-deprecation"

RUN apk add --no-cache curl

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/src/lib/db/migrations ./src/lib/db/migrations

# drizzle-orm must be in runner for startup.js migrations
COPY --from=deps /app/node_modules/drizzle-orm ./node_modules/drizzle-orm
COPY --from=deps /app/node_modules/pg ./node_modules/pg

COPY --chown=nextjs:nodejs scripts/startup.js ./startup.js
COPY --chown=nextjs:nodejs scripts/config-seed.js ./config-seed.js

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=15s --timeout=5s --start-period=60s --retries=5 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node", "startup.js"]
```

---

## 5. STARTUP SCRIPT (Same Pattern as StockSense)

```javascript
// scripts/startup.js
const { drizzle } = require("drizzle-orm/node-postgres");
const { migrate } = require("drizzle-orm/node-postgres/migrator");
const { Pool } = require("pg");
const path = require("path");

async function main() {
  console.log("[startup] Starting APRAS Naturals...");

  // 1. Run DB migrations
  console.log("[startup] Running DB migrations...");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  try {
    await migrate(db, {
      migrationsFolder: path.join(__dirname, "src/lib/db/migrations"),
    });
    console.log("[startup] Migrations complete.");
  } catch (err) {
    console.error("[startup] Migration error:", err.message);
    // Non-fatal — continue startup
  }

  // 2. Seed default config values
  console.log("[startup] Seeding config defaults...");
  try {
    require("./config-seed.js");
    console.log("[startup] Config seed complete.");
  } catch (err) {
    console.error("[startup] Config seed error:", err.message);
  }

  await pool.end();

  // 3. Start Next.js server
  console.log("[startup] Starting Next.js server...");
  const { createServer } = require("http");
  const { parse } = require("url");
  const next = require("./server.js");
  // Next.js standalone server.js handles the actual serving
}

main().catch(console.error);
```

---

## 6. COOLIFY CI/CD SETUP

### Step 1: Create New Resource in Coolify

1. Open `http://178.104.149.128:8000` → Login
2. **Projects** → Create project "APRAS Naturals" (or add to existing)
3. Click **+ New Resource** → **Application**
4. Server: `178.104.105.31` (qbiqal-app-server)
5. Source: **GitHub** → Select `qbiqal/apras-naturals` → Branch: `main`

### Step 2: Build Configuration

```
Build Pack:         Dockerfile
Dockerfile Location: Dockerfile
Port:               3000
```

### Step 3: Environment Variables (in Coolify)

```bash
# Database
DATABASE_URL=postgresql://apras_user:YOUR_PW@178.104.158.232:6432/apras_naturals_db
PGBOUNCER=true

# Redis
REDIS_URL=redis://:YOUR_REDIS_PW@178.104.158.112:6379

# Auth
JWT_SECRET=GENERATE_64_CHAR_HEX_WITH_openssl_rand_-hex_32

# App
NEXT_PUBLIC_APP_URL=https://aprasnaturals.com
NODE_ENV=production

# Media (R2 — configure after R2 bucket created)
CLOUDFLARE_R2_ACCOUNT_ID=
CLOUDFLARE_R2_ACCESS_KEY_ID=
CLOUDFLARE_R2_SECRET_ACCESS_KEY=
CLOUDFLARE_R2_BUCKET_NAME=apras-naturals-media
CLOUDFLARE_R2_PUBLIC_URL=

# WhatsApp
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=
ADMIN_WHATSAPP_NUMBER=+919470309006

# Email
RESEND_API_KEY=

# Internal
INTERNAL_API_TOKEN=GENERATE_RANDOM_TOKEN

# Monitoring
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
```

### Step 4: CI/CD Webhook (No GitHub Actions — Coolify-native)

1. Coolify → APRAS Naturals App → **Settings** → **Webhooks** → Copy webhook URL
2. GitHub → `qbiqal/apras-naturals` → **Settings** → **Webhooks**
3. Add webhook → Paste Coolify URL → Content type: `application/json`
4. Events: **Just the push event** → Branch filter: `main`
5. Every push to `main` triggers auto-deploy on Coolify

```
Push flow:
  git push origin main
  → GitHub sends webhook to Coolify
  → Coolify clones repo, builds Docker image on app server
  → Runs: npm run db:generate + npm run build
  → Startup: migrations → config-seed → server starts
  → Health check passes → old container replaced (zero-downtime)
```

### Step 5: Domain Configuration

1. Coolify → APRAS Naturals → **Settings** → **Domains**
2. Add: `aprasnaturals.com` (or whatever domain client provides)
3. SSL: Let's Encrypt (auto) or Cloudflare Origin Certificate

---

## 7. AGENT.MD (For Future AI Agents)

```markdown
# APRAS Naturals — AI Agent Instructions

## Project
Full-stack CMS + E-Commerce + Blog platform for APRAS Naturals (authorized Prakvedaa partner).
Sells: Tulsi/Karanj/Moringa Honey (500g/1kg) + A2 Bilona Ghee.

## Tech Stack
- Next.js 16.2.2 (App Router, Turbopack)
- TypeScript · Custom CSS (NO shadcn/Tailwind)
- PostgreSQL 17 + Drizzle ORM
- Redis 7 (ioredis, keyPrefix: "an:")
- JWT (jose) + cookie-based sessions

## Key Rules
1. NO shadcn, NO Radix, NO Tailwind — pure CSS variables + modules
2. Customer portal: top nav (StockSense member pattern)
3. Admin panel: left sidebar (StockSense admin pattern)
4. Redis namespace: an:* (never use bare keys)
5. DB config: siteConfig table (same pattern as StockSense appConfig)
6. Cache invalidation: event-based, prefix-based (see src/lib/cache.ts)
7. Auth: createAuthGuard() / createAdminGuard() from src/lib/middleware.ts
8. Commits: Qbiqal <qbiqal.official@gmail.com>

## Infrastructure
- App Server: 178.104.105.31 (Docker via Coolify)
- PG: 178.104.158.232:6432 (PgBouncer) → apras_naturals_db
- Redis: 178.104.158.112:6379 → an: prefix
- Coolify: 178.104.149.128:8000

## File Conventions
- SSR pages: page.tsx (server) + *Client.tsx (client)
- No file > 200 lines — break into components
- API routes: route.ts with named exports (GET, POST, etc.)
- All imports use @/ alias
```

---

## 8. PHASE-BY-PHASE DEVELOPMENT ROADMAP

### PHASE 0 — Foundation (DO FIRST)
**Goal:** Working deployment pipeline before any feature work.

```
0.1 [ ] Create GitHub repo: qbiqal/apras-naturals
0.2 [ ] Install Next.js 16.2.2 + all deps
0.3 [ ] Setup PG database + user on 178.104.158.232
0.4 [ ] Add PgBouncer entry for apras_naturals_db
0.5 [ ] Create Dockerfile (multi-stage, same as StockSense)
0.6 [ ] Create scripts/startup.js
0.7 [ ] Setup Coolify resource on 178.104.105.31
0.8 [ ] Add all env vars in Coolify
0.9 [ ] First successful deploy (shows Next.js default page)
0.10[ ] Add GitHub webhook → Coolify auto-deploy
0.11[ ] Create CLAUDE.md + agent.md
0.12[ ] /api/health endpoint returns 200
```

### PHASE 1 — DB Schema + Auth (Week 1)

```
1.1 [ ] Write complete schema.ts (all tables from Part 2)
1.2 [ ] npm run db:generate → first migration
1.3 [ ] Write seed.ts (admin user, default products, config defaults)
1.4 [ ] Write config-seed.js (idempotent — runs on every deploy)
1.5 [ ] Write indexes.ts (all performance indexes)
1.6 [ ] src/lib/redis.ts (ioredis, an: prefix)
1.7 [ ] src/lib/cache.ts (3-layer cache + event invalidation)
1.8 [ ] src/lib/auth.ts (JWT create/verify)
1.9 [ ] src/lib/middleware.ts (createAuthGuard, createAdminGuard)
1.10[ ] src/lib/errors.ts (AppError, handleApiError)
1.11[ ] POST /api/auth/login
1.12[ ] POST /api/auth/register
1.13[ ] GET  /api/auth/me
1.14[ ] POST /api/auth/logout
1.15[ ] proxy.ts (route protection)
```

### PHASE 2 — CSS System + Layout Components (Week 1-2)

```
2.1 [ ] src/app/globals.css (CSS variables, dark mode admin support)
2.2 [ ] components/ui/Button (variants: primary, secondary, ghost, danger)
2.3 [ ] components/ui/Card
2.4 [ ] components/ui/Input, Textarea, Select
2.5 [ ] components/ui/Modal
2.6 [ ] components/ui/Toast (notification system)
2.7 [ ] components/ui/Badge (order status colors)
2.8 [ ] components/ui/Spinner
2.9 [ ] components/layout/PublicNav (landing page nav)
2.10[ ] components/layout/CustomerHeader (top nav, StockSense member style)
2.11[ ] components/layout/AdminSidebar (left sidebar, StockSense admin style)
2.12[ ] components/layout/Footer
2.13[ ] (auth) login/register pages
```

### PHASE 3 — Shop & Product Pages (Week 2)

```
3.1 [ ] GET /api/products (list, filter by category, active)
3.2 [ ] GET /api/products/[slug] (detail)
3.3 [ ] components/shop/ProductCard
3.4 [ ] components/shop/ProductGrid
3.5 [ ] (public)/shop/page.tsx (product listing, SSR)
3.6 [ ] (public)/shop/[slug]/page.tsx (product detail, SSR)
3.7 [ ] Cart state (zustand or context + localStorage)
3.8 [ ] components/shop/CartDrawer
3.9 [ ] Cart badge in CustomerHeader
```

### PHASE 4 — Checkout + Order Flow (Week 2-3)

```
4.1 [ ] /checkout/page.tsx (address + items review)
4.2 [ ] /checkout/payment/page.tsx (QR display + proof upload)
4.3 [ ] /checkout/confirmation/page.tsx
4.4 [ ] POST /api/orders (create order)
4.5 [ ] POST /api/orders/[id]/upload-proof (upload payment screenshot)
4.6 [ ] src/lib/whatsapp.ts (Meta Cloud API notify admin on new order)
4.7 [ ] Order number generator (AN-YYYY-NNNN)
4.8 [ ] components/checkout/CheckoutForm
4.9 [ ] components/checkout/PaymentQR (QR image from siteConfig)
4.10[ ] Email confirmation on order placed (Resend)
```

### PHASE 5 — Customer Portal (Week 3)

```
5.1 [ ] (customer)/orders/page.tsx (order list, status badges)
5.2 [ ] (customer)/orders/[id]/page.tsx (detail + status roadmap)
5.3 [ ] (customer)/profile/page.tsx (edit name, phone, addresses)
5.4 [ ] GET /api/customer/orders
5.5 [ ] GET /api/customer/orders/[id]
5.6 [ ] GET /api/customer/profile
5.7 [ ] PATCH /api/customer/profile
5.8 [ ] components/checkout/OrderTimeline (roadmap component)
5.9 [ ] components/ui/Notifications (bell + drawer)
5.10[ ] GET/PATCH /api/customer/notifications
```

### PHASE 6 — Admin Panel (Week 3-4)

```
6.1 [ ] Admin layout + sidebar + responsive
6.2 [ ] /admin/dashboard (stats + recent orders)
6.3 [ ] /admin/orders (list, filter, search)
6.4 [ ] /admin/orders/[id] (detail, proof view, status update, WhatsApp buttons)
6.5 [ ] /admin/products (list, create, edit, delete)
6.6 [ ] /admin/customers (list, detail)
6.7 [ ] /admin/analytics (basic charts)
6.8 [ ] Admin API routes for all above
6.9 [ ] PATCH /api/admin/orders/[id]/status
6.10[ ] POST /api/admin/orders/[id]/whatsapp (send notification)
6.11[ ] src/lib/whatsapp.ts: sendToCustomer()
```

### PHASE 7 — Media Uploader Component (Week 4)

```
7.1 [ ] components/media/MediaUploader (dnd-kit drag & drop)
7.2 [ ] components/media/ImageCropper (react-image-crop wrapper)
7.3 [ ] POST /api/media/upload (sharp processing + R2 or local)
7.4 [ ] /admin/media (media library grid, folder filter)
7.5 [ ] GET /api/admin/media
7.6 [ ] DELETE /api/admin/media/[id]
7.7 [ ] Integrate MediaUploader into product form
7.8 [ ] Integrate MediaUploader into blog editor
7.9 [ ] Integrate MediaUploader into CMS editor
```

### PHASE 8 — Blog System (Week 4-5)

```
8.1 [ ] /admin/blog (list grid/list toggle, create button)
8.2 [ ] /admin/blog/new (rich text editor + MediaUploader)
8.3 [ ] /admin/blog/[id]/edit
8.4 [ ] Blog CRUD API routes
8.5 [ ] (public)/blog/page.tsx (grid, pagination, SSR)
8.6 [ ] (public)/blog/[slug]/page.tsx (detail, related posts, SSR)
8.7 [ ] Blog cache invalidation on publish/update
8.8 [ ] Blog SEO: og:image, meta description from excerpt
8.9 [ ] /admin/blog/categories (manage categories)
```

### PHASE 9 — CMS / Landing Page (Week 5)

```
9.1 [ ] /admin/cms (sections list with enable/disable toggles)
9.2 [ ] /admin/cms/[sectionKey] (section editor form)
9.3 [ ] CMS API routes (GET/PUT per section)
9.4 [ ] landing page page.tsx uses CMS data (SSR)
9.5 [ ] Hero section from CMS
9.6 [ ] Products section from CMS + DB
9.7 [ ] Testimonials section from CMS + DB
9.8 [ ] FAQ section from CMS
9.9 [ ] All remaining sections
9.10[ ] Cache: an:page:cms:landing (1h TTL, invalidate on any CMS update)
9.11[ ] /admin/cms/testimonials (manage testimonials + approval)
```

### PHASE 10 — Polish & Production (Week 5-6)

```
10.1[ ] Sentry setup (client + server + edge)
10.2[ ] /api/health endpoint (DB ping + Redis ping)
10.3[ ] Error boundaries (customer portal + admin)
10.4[ ] Loading states + skeletons throughout
10.5[ ] Mobile responsiveness audit
10.6[ ] Image optimization (lazy loading, blur placeholders)
10.7[ ] SEO: sitemap.ts, robots.ts, og meta per page
10.8[ ] Rate limiting (login endpoint: 10 req/min per IP)
10.9[ ] Security: CSRF protection, input sanitization
10.10[ ] Admin panel dark mode
10.11[ ] E2E flow test: register → order → payment upload → admin verify → shipped
10.12[ ] Performance: Lighthouse score > 90 on public pages
10.13[ ] Deploy to production + DNS setup
10.14[ ] Post-launch checklist (see below)
```

---

## 9. PRODUCTION CHECKLIST

### Infrastructure
- [ ] PG database `apras_naturals_db` created + user + PgBouncer entry
- [ ] PgBouncer reloaded + verified from app server
- [ ] Redis connection verified from app server (`an:` namespace)
- [ ] Firewall: port 6432 open from 178.104.105.31 → 178.104.158.232
- [ ] Firewall: port 6379 open from 178.104.105.31 → 178.104.158.112

### Application
- [ ] All env vars set in Coolify
- [ ] JWT_SECRET: strong 64-char random hex
- [ ] First deploy successful, /api/health returns 200
- [ ] DB migrations applied (all tables created)
- [ ] Seed executed: admin user, products, config defaults
- [ ] Indexes created
- [ ] Default admin password changed from seed default

### External Services
- [ ] GitHub webhook → Coolify (auto-deploy on push to main)
- [ ] Cloudflare R2 bucket created + credentials in env
- [ ] WhatsApp Meta Cloud API setup
- [ ] Resend API key + domain verified
- [ ] Sentry project created + DSN in env

### Post-Launch
- [ ] Test full order flow: guest checkout → QR payment → admin verify → shipped
- [ ] Test WhatsApp notifications (order placed + confirmed + shipped)
- [ ] Test customer portal (login → view orders → tracking)
- [ ] Test admin panel (all CRUD operations)
- [ ] Test blog publish flow
- [ ] Test CMS section editing
- [ ] Monitor Sentry for first 48h
- [ ] Uptime monitoring (UptimeRobot on /api/health)

---

## 10. ESTIMATED TIMELINE

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| 0: Foundation | 1 day | Deployed empty app, CI/CD working |
| 1: DB + Auth | 2-3 days | Schema, auth endpoints, middleware |
| 2: CSS + Layout | 2 days | Design system, nav components |
| 3: Shop | 2 days | Product listing + detail pages |
| 4: Checkout | 2 days | Order creation + QR payment |
| 5: Customer Portal | 2 days | Orders, tracking, profile |
| 6: Admin Panel | 4 days | Full admin (orders, products, customers) |
| 7: Media Uploader | 2 days | Drag & drop, crop, R2 upload |
| 8: Blog | 3 days | Admin editor + public pages |
| 9: CMS | 3 days | Full landing page CMS |
| 10: Polish + Prod | 3 days | SEO, perf, security, launch |
| **Total** | **~6 weeks** | **Full platform** |

---

## 11. QUICK COMMANDS REFERENCE

```bash
# Development
npm run dev                    # Start dev server (Turbopack)
npm run build                  # Production build

# Database
npm run db:generate            # Generate migration from schema changes
npm run db:migrate             # Apply migrations
npm run db:push                # Push schema directly (dev only)
npm run db:seed                # Seed admin + products + config defaults
npm run db:indexes             # Create performance indexes
npm run db:studio              # Drizzle Studio visual explorer

# Deploy
git push origin main           # → Coolify auto-deploys via webhook

# SSH servers
ssh -i ~/.ssh/qbiqal_hetzner root@178.104.105.31    # App server
ssh -i ~/.ssh/qbiqal_hetzner root@178.104.158.232   # PG server
ssh -i ~/.ssh/qbiqal_hetzner root@178.104.158.112   # Redis server

# Coolify terminal (no SSH needed)
# Coolify → APRAS Naturals App → Terminal → run commands in container
```

---

*Blueprint created: 2026-05-30. Infrastructure: Shared Hetzner cluster (4 servers). Stack: Next.js 16.2.2 + PostgreSQL 17 + Redis 7 + Coolify CI/CD. No UI component libraries — pure CSS variables. Customer panel: top nav. Admin panel: left sidebar.*
