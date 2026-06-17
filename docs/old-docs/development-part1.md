# BuyWell Marketplace — Development Blueprint Part 1
## Product Vision, Route Policy, Architecture, and Local Setup

> Last updated: 2026-05-30
> Stack: Next.js 16.2.2, React 19, TypeScript 5.9, PostgreSQL 17, Redis 7, Drizzle ORM, CSS Modules.
> Current route policy: `/` is the CMS landing page. `/home` is retained as an alias and the previous Coming Soon page is available at `/coming-soon`.

---

## 1. Product Vision

BuyWell Marketplace is a modular CMS + E-Commerce + Blog platform for an authorized Prakvedaa partner selling mono-floral honey and A2 Bilona Ghee.

The business flow is intentionally offline-payment first:

1. Customer browses products.
2. Customer adds items to cart or requests a free sample.
3. Customer checks out with delivery details.
4. Customer pays via UPI/QR and uploads proof.
5. Admin verifies the proof.
6. Admin confirms, ships, and updates tracking.
7. Customer follows order status in the portal.

The platform must stay lightweight. Core must load on every deployment, but CMS, Blog, E-Commerce, and payment gateways should become modules that can be enabled or disabled from the admin panel.

---

## 2. Current Route Policy

| Route | Purpose | Status |
|---|---|---|
| `/` | Full CMS homepage | ✅ Current root |
| `/home` | Full CMS homepage alias | ✅ Active alias |
| `/coming-soon` | Previous Coming Soon page | ✅ Retained |
| `/shop` | Product listing | ✅ |
| `/shop/[slug]` | Product detail | ✅ |
| `/blog` | Blog listing | ✅ |
| `/blog/[slug]` | Blog detail | ✅ |
| `/checkout` | Checkout / sample request | ✅ |
| `/checkout/payment` | QR payment proof upload | ✅ |
| `/orders`, `/orders/[id]` | Customer order portal | ✅ |
| `/profile` | Customer profile and addresses | ✅ |
| `/admin/*` | Admin panel | ✅ Current modules built and gated |

Launch switch:

- ✅ Move the `/home` experience to `/`.
- ✅ Keep `/home` as an alias.
- ✅ Repurpose the current Coming Soon page to `/coming-soon`.

---

## 3. Module Architecture Target

### 3.1 Architecture Decision

Keep the main platform as a **Next.js-first modular monolith**.

Do not add NestJS for the normal CMS, Blog, E-Commerce, admin, and checkout flows. Each client gets one install, so another backend runtime would make simple CMS-only deployments heavier. A separate NestJS service can be reconsidered later for heavy MLM/payout/ledger engines only if they need independent queues, workers, or API scaling.

### 3.2 Modules

| Module | Can Disable? | Responsibility |
|---|---:|---|
| Core | No | Auth, users, roles, settings, health, DB, Redis, cache, module registry, layout shell |
| CMS | Yes | Homepage sections, testimonials, content blocks, public `/home`, admin CMS |
| E-Commerce | Yes | Products, variants, cart, checkout, orders, customer orders, admin orders/products |
| Blog | Yes | Public blog, blog admin, categories, post metadata |
| Payment: Offline QR | Yes | QR config, UPI instructions, proof upload, manual admin verification |

Core cannot be disabled. All other modules should eventually be switchable in admin settings.

### 3.3 O(N) Loading Principle

The target is simple and predictable:

- The app reads enabled module keys once per request or from a short Redis cache.
- Navigation is built by iterating over enabled module manifests.
- Route/API handlers call `requireModule("module_key")` before running module work.
- Heavy module services are imported lazily.
- Disabled modules should not expose nav items, admin pages, public pages, API handlers, queues, or gateway registrations.
- A CMS-only install should not wrap the app in cart/order/payment providers.
- A Blog-only install should not load shop/cart/checkout/payment behavior.

This means module loading scales with the number of enabled modules, not with every possible feature installed in the codebase.

### 3.4 Proposed Module Manifest

```ts
export interface AppModule {
  key: string;
  name: string;
  canDisable: boolean;
  defaultEnabled: boolean;
  dependencies?: string[];
  adminNav?: Array<{ label: string; href: string; icon: string }>;
  publicNav?: Array<{ label: string; href: string }>;
}
```

### 3.5 First Implementation

Use the existing DB-backed `site_config` table first:

```txt
module_core_enabled=true
module_cms_enabled=true
module_ecommerce_enabled=true
module_blog_enabled=true
payment_offline_qr_enabled=true
```

Later, if this grows, add first-class `modules` and `payment_gateways` tables.

### 3.6 Multilingual and Multicurrency Baseline

Core owns the global locale/currency settings:

```txt
locale_default=en
locales_enabled=en,hi
currency_default=INR
currencies_enabled=INR
currency_rates_json={"INR":1}
```

Modules consume these settings only when enabled:

- CMS: translated section config.
- Blog: localized posts/slugs.
- E-Commerce: currency display and gateway support.
- Payment modules: supported currency declaration.

---

## 4. Current Implementation Summary

### Built

- ✅ Next.js 16.2.2 App Router project.
- ✅ PostgreSQL schema and Drizzle migration.
- ✅ Redis with `an:` key prefix.
- ✅ JWT cookie auth with `bw_token`.
- ✅ Admin/customer guards and Next 16 `proxy.ts`.
- ✅ Public shop, product detail, blog, checkout, payment, and confirmation pages.
- ✅ Customer orders and profile.
- ✅ Admin dashboard, orders, products, customers, blog, CMS list, settings.
- ✅ CMS section detail editor.
- ✅ Blog category admin.
- ✅ Module control plane: Core locked on, CMS/Blog/E-Commerce/Offline QR toggles, module-aware nav, page gates, API gates.
- ✅ Dynamic cart provider/header imports so CMS-only and Blog-only installs do not load cart UI.
- ✅ Core-owned localization and currency settings.
- ✅ Admin analytics with range filters, revenue/order/product/customer charts, and CSV export.
- ✅ Admin WhatsApp panel with manual send, templates, order resend, and delivery logs.
- ✅ Auth recovery pages/APIs: forgot password, reset password, email verification, resend verification.
- ✅ Core notification/OTP provider layer with Resend config, in-app notifications, delivery logs, and push subscription storage.
- ✅ Admin provider key provisions for Resend, SMS, Telegram, Web Push, WhatsApp, R2, Razorpay, Stripe, and Sentry.
- ✅ DB-first config with `.env` fallback for external keys.
- ✅ Secret config encryption at rest for provider/API keys.
- ✅ Rich HTML sanitization for blog content and product long descriptions.
- ✅ Sitemap, robots, and Redis auth rate limiting.
- ✅ Same-site API mutation hardening and Sentry server-side capture path.
- ✅ Offline QR payment abstraction and gateway registry order flow.
- ✅ Signed payment-proof upload tokens.
- ✅ Server-side order price recalculation and stock decrement.
- ✅ MediaUploader component and upload API.
- ✅ Admin media library exists with upload, browse, preview, URL copy, metadata edit, and guarded delete.
- ✅ Cloudflare R2 signed upload helper.
- ✅ Dockerfile and startup script.

### Partial

- ✅ `/` is the real CMS homepage, `/home` is an alias, and `/coming-soon` keeps the old Coming Soon page.
- 🟡 Actual SMS/Telegram/Web Push send adapters depend on final provider/vendor selection.
- 🟡 Deeper module-folder/package splitting is reserved for future heavy MLM/payment engines; current modules are runtime-gated.

### Pending

- ✅ Production launch switch from `/home` to `/` completed for the current local build.
- ❌ Seed admin password rotation or first-admin setup before production.

---

## 5. Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16.2.2 App Router |
| Runtime UI | React 19 |
| Language | TypeScript 5.9 |
| Styling | CSS variables + CSS Modules |
| ORM | Drizzle ORM |
| Database | PostgreSQL 17 |
| Cache | Redis 7 via ioredis |
| Auth | JWT via jose + bcryptjs |
| Media | Local dev uploads; Cloudflare R2 target for production |
| Notifications | Resend email, in-app notifications, WhatsApp Meta Cloud API, provider slots for SMS/Telegram/Web Push |
| Deployment | Docker through Coolify |

Rules:

- No shadcn, Radix, Tailwind UI, or external UI kits.
- Config should come from `site_config` first, env fallback second.
- External/API keys must be editable in Admin Settings; `.env` values are fallback only when DB config is empty.
- Secret provider values must stay encrypted at rest when app secrets are configured.
- Prices are stored in paise.
- API responses use `{ success, data, error, pagination }`.
- Public read-heavy queries should use Redis cache and admin mutations should invalidate relevant prefixes.

---

## 6. Infrastructure

| Component | Host | Purpose |
|---|---|---|
| Coolify | `178.104.149.128:8000` | Control plane |
| App server | `178.104.105.31` | Docker app runtime |
| PostgreSQL | `178.104.158.232:5432` | `buywell_multivendor_new` |
| Redis | `178.104.158.112:6379` | `an:` namespace |
| Domain | `buywell.in` | Cloudflare configured |

Current project decision: direct PostgreSQL on `:5432`. Keep code PgBouncer-compatible for later, but do not require PgBouncer now.

---

## 7. Local Development Setup

Local services are already running.

Completed locally:

- ✅ PostgreSQL responds on local socket.
- ✅ Redis responds with `PONG`.
- ✅ Local role `bw_user` created.
- ✅ Local DB `buywell_multivendor_new` created.
- ✅ `.env.local` created with local DB/Redis/JWT/app URL.
- ✅ `npm run db:migrate` applied migrations.
- ✅ `npm run db:seed` seeded admin/products/CMS/blog categories.
- ✅ `scripts/config-seed.js` seeded config defaults.
- ✅ `npm run db:indexes` created 42 indexes.
- ✅ `npm run verify` passes.

Local counts after seed:

| Table | Count |
|---|---:|
| users | 1 |
| products | 4 |
| product_variants | 9 |
| cms_sections | 13 |
| site_config | 90 |
| otp_codes | 0 |
| notification_deliveries | 0 |
| push_subscriptions | 0 |
| blog_categories | 4 |
| whatsapp_logs | 0 |

Local commands:

```bash
set -a; . ./.env.local; set +a
npm run db:migrate
npm run db:seed
node -e "require('./scripts/config-seed.js')().then(()=>console.log('config defaults seeded'))"
npm run db:indexes
npm run build
npm run smoke
npm run e2e
npm run verify
```

---

## 8. Repository Structure

```txt
src/app/
  page.tsx                         # CMS landing root
  home/page.tsx                    # CMS landing alias
  coming-soon/page.tsx             # Previous Coming Soon page
  (public)/shop                    # Shop list/detail
  (public)/blog                    # Blog list/detail
  (auth)/login, register           # Auth
  (customer)/orders, profile       # Customer portal
  (admin)/admin                    # Admin panel
  checkout                         # Checkout/payment/confirmation
  api                              # Route handlers

src/components/
  ui                               # Button, Card, Input, Modal, Toast, Badge, Spinner, Logo
  layout                           # CustomerHeader, AdminSidebar, Footer
  shop                             # ProductCard, CartContext, CartDrawer
  media                            # MediaUploader
  checkout                         # OrderTimeline

src/lib/
  db                               # Drizzle connection, schema, seed, indexes, migrations
  payment                          # Gateway abstraction and Offline QR
  auth.ts, middleware.ts           # JWT and guards
  cache.ts, redis.ts, config.ts    # Redis cache and DB-backed config
  media.ts                         # R2/local media helper
  whatsapp.ts, email.ts            # Notifications
```

---

## 9. Source Audit Notes

Important findings from the audit:

- ✅ `/` is the full CMS homepage and compiles.
- ✅ `/home` is retained as a landing alias.
- ✅ `/coming-soon` retains the old Coming Soon page.
- ✅ Product detail, CartDrawer, admin product CRUD, and customer profile exist and compile.
- ✅ Media upload now requires admin auth.
- ✅ Order creation now uses a real Drizzle transaction.
- ✅ Shipping config defaults now use paise.
- ✅ Module enable/disable control plane is implemented and verified.
- ✅ Admin customers list/detail is implemented and verified.
- ✅ Auth recovery, notification/OTP, sitemap, robots, and Redis auth rate limiting are implemented and verified.

---

## 10. Next Development Rule

After each roadmap phase is completed:

1. Mark the phase ✅ in `docs/roadmap.md`.
2. Update `CLAUDE.md` current status.
3. Update `docs/mind-map.md`.
4. Run `npm run verify`.
5. If DB/schema changed, run migration and update local/production notes.
