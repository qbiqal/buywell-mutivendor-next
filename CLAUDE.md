# APRAS Naturals — AI Agent Reference

> Last updated: 2026-05-30
> Framework: Next.js 16.2.2
> DB: PostgreSQL 17
> Cache: Redis 7 with `an:` prefix
> Current route policy: `/` is the CMS landing page, `/home` is an alias, and Coming Soon is available at `/coming-soon`.

---

## Strict Rules

1. Git commits must use `Qbiqal <qbiqal.official@gmail.com>`.
2. No external UI libraries: no shadcn, Radix, Tailwind UI, or component kits.
3. Read Next.js docs from `node_modules/next/dist/docs/` before changing framework conventions.
4. Config must come from DB first via `src/lib/config.ts`; env is fallback only.
5. Redis keys must be passed without the `an:` prefix because ioredis adds it through `keyPrefix`.
6. Payment must stay pluggable. Offline QR is gateway #1.
7. Core must stay lightweight. CMS, E-Commerce, Blog, and payment gateways are target modules.
8. Keep `/` module-aware: when CMS is disabled it redirects to `/login`; Coming Soon stays at `/coming-soon`.
9. Use `page.tsx` as the server shell and `*Client.tsx` for interactivity.
10. Run `npm run verify` after meaningful source changes unless the change is docs-only.

---

## Current Status

### Complete and Build-Verified

- ✅ Local PostgreSQL database created and initialized.
- ✅ Redis connectivity verified.
- ✅ Migrations, seed, config seed, and indexes applied locally.
- ✅ `/` full CMS landing page is active.
- ✅ `/home` remains a CMS landing alias.
- ✅ `/coming-soon` keeps the previous Coming Soon page.
- ✅ Landing hero is pure scroll-scrub video: no intro heading/subheading layer, no video overlay, and the video remains paused unless scroll changes frames.
- ✅ Shop listing and product detail with image gallery carousel, fallback product assets, and admin-only edit shortcut.
- ✅ CartContext and CartDrawer.
- ✅ Checkout, QR payment, proof upload, confirmation.
- ✅ Customer orders and profile/address/password management.
- ✅ Admin dashboard, orders, products, blog, CMS list, settings.
- ✅ Reusable admin datatable filter panel on products, customers, orders, and blog with search, status, date range, amount/price/stock/content filters where applicable.
- ✅ Admin customer list/detail with search, spend/order stats, addresses, orders, and deactivate/reactivate.
- ✅ Admin media library with grid/list filters, upload, preview, URL copy, alt/folder edit, and guarded delete.
- ✅ Admin analytics with revenue/orders/payment/product/customer charts and CSV export.
- ✅ Admin WhatsApp panel with manual send, template manager, order resend API/buttons, and delivery logs.
- ✅ Auth recovery flow: forgot password, reset password, email verification, resend verification.
- ✅ Core notification/OTP provider layer with Resend email gateway, in-app notifications, delivery logs, and push subscription storage.
- ✅ Admin provider key provisions for Resend, SMS, Telegram, Web Push, WhatsApp, R2, Razorpay, Stripe, and Sentry; DB config is primary and `.env` is fallback.
- ✅ Secret config encryption at rest for provider/API keys.
- ✅ Sitemap and robots.
- ✅ Redis rate limiting for login/register/recovery attempts.
- ✅ Same-site API mutation hardening in `proxy.ts`.
- ✅ Sentry server-side capture path with DB config/env fallback.
- ✅ Rich HTML sanitization for blog content and product long descriptions.
- ✅ Module control plane for Core, CMS, Blog, E-Commerce, and Offline QR.
- ✅ Admin module toggles, locked Core toggle, localization, currency, notification, OTP, and Resend settings.
- ✅ Module-aware public/admin nav, route gates, API gates, and root providers.
- ✅ Module-aware dynamic cart provider/header imports so CMS-only/Blog-only installs do not load cart UI.
- ✅ Offline QR payment gateway abstraction and registry-based order creation.
- ✅ MediaUploader and admin-authenticated upload API.
- ✅ Cloudflare R2 signed upload helper.
- ✅ Signed payment-proof upload token.
- ✅ Server-side order price recalculation and stock decrement.
- ✅ Product variant preservation/archive behavior for historical order safety.
- ✅ App-wide Public Sans font, dark mode variables, admin topbar theme switch, and dark-mode persistence.
- ✅ Shared and landing footers upgraded with stronger CTA/trust sections.
- ✅ CMS section editor and Blog category admin.
- ✅ `npm run verify` passes: build, smoke, and E2E.

### Partial / Pending

- 🟡 Deeper `src/modules/<module>/` package splitting is reserved for future heavy MLM/payment engines; current modules are gated and current cart code is dynamically imported.
- 🟡 Push subscription storage and provider config exist; actual Web Push sending depends on final provider/runtime choice.
- 🟡 SMS/Telegram provider config exists; actual provider adapters depend on selected vendor/API contract.
- ❌ Seed admin password must be rotated or replaced with first-admin setup before production.

See `docs/roadmap.md` for the source-of-truth tracker.

---

## Local Setup

`.env.local` is local-only and ignored by git.

Useful local commands:

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

Local seed counts after audit:

| Table | Count |
|---|---:|
| users | 1 |
| products | 4 |
| product_variants | 9 |
| product_images | 12 |
| cms_sections | 14 |
| site_config | 90 |
| otp_codes | 0 |
| notification_deliveries | 0 |
| push_subscriptions | 0 |
| whatsapp_logs | 0 |
| blog_categories | 4 |

---

## Architecture

```txt
Core
  auth, users, settings, notifications, OTP, media library, DB, Redis, cache, route protection, module registry, provider key config

CMS Module
  /home, /admin/cms, cms_sections, testimonials, landing content

E-Commerce Module
  /shop, /checkout, /orders, /profile, admin orders/products/customers, products, variants, orders

Blog Module
  /blog, /admin/blog, blog_posts, blog_categories

Payment Submodules
  offline_qr now; Razorpay/Stripe/etc later
```

Implemented module behavior:

- Core cannot be disabled.
- CMS, E-Commerce, Blog, and Offline QR can be enabled/disabled from admin.
- Disabled modules hide public/admin nav, block pages/APIs, and skip e-commerce providers.
- Notification channels and OTP behavior are Core settings, not business modules.
- Current config keys: `module_cms_enabled`, `module_ecommerce_enabled`, `module_blog_enabled`, `payment_offline_qr_enabled`.
- Current cart provider and cart header actions are dynamically imported only when E-Commerce is enabled.
- Next hardening rule: split future heavy MLM/payment modules into module folders/services and dynamically import them only when enabled.

---

## File Index

### Root

| File | Purpose |
|---|---|
| `Dockerfile` | Production container build |
| `drizzle.config.ts` | Drizzle migration config |
| `next.config.ts` | Next standalone output, remote images, pg external package |
| `package.json` | Scripts and dependencies |
| `scripts/startup.js` | Production startup: migrate, seed config, start server |
| `scripts/config-seed.js` | Idempotent `site_config` defaults |
| `scripts/smoke.ts` | Local smoke checks for seeded config/modules/localization/currency/notification/OTP |
| `scripts/e2e.ts` | Live Next dev E2E for route/API/auth/notification/module-gate checks |
| `docs/roadmap.md` | Current tracker and next phases |
| `docs/mind-map.md` | Platform map |
| `docs/development-part1.md` | Product, architecture, local setup |
| `docs/development-part2.md` | DB/API/cache/module feature specs |
| `docs/development-part3.md` | Deployment, operations, production checklist |

### `src/app`

| Path | Purpose | Status |
|---|---|---|
| `page.tsx` | CMS landing root | ✅ |
| `home/page.tsx` | CMS landing alias | ✅ |
| `layout.tsx` | Module-aware root providers: Toast always, Cart only when E-Commerce enabled | ✅ |
| `(public)/layout.tsx` | Public shell with module-aware CustomerHeader/Footer | ✅ |
| `(public)/page.tsx` | CMS landing route-group shell | ✅ |
| `(public)/LandingClient.tsx` | Landing renderer | ✅ |
| `(public)/shop/page.tsx` | Shop listing shell | ✅ |
| `(public)/shop/ShopClient.tsx` | Shop listing UI/filter | ✅ |
| `(public)/shop/[slug]/page.tsx` | Product detail shell/metadata | ✅ |
| `(public)/shop/[slug]/ProductDetailClient.tsx` | Product gallery/variant/cart UI | ✅ |
| `(public)/blog/page.tsx` | Blog listing shell | ✅ |
| `(public)/blog/BlogListingClient.tsx` | Blog listing UI | ✅ |
| `(public)/blog/[slug]/page.tsx` | Blog detail | ✅ |
| `(auth)/login/*` | Login page/client | ✅ |
| `(auth)/register/*` | Register page/client | ✅ |
| `(auth)/forgot-password/*` | Forgot password request | ✅ |
| `(auth)/forget-password/*` | Typo alias redirect to forgot password | ✅ |
| `(auth)/reset-password/*` | Reset password with OTP | ✅ |
| `(auth)/verify-email/*` | Email verification with OTP | ✅ |
| `(customer)/layout.tsx` | Customer shell | ✅ |
| `(customer)/orders/*` | Customer order list/detail | ✅ |
| `(customer)/profile/*` | Profile, addresses, password | ✅ |
| `(customer)/notifications/*` | In-app notification center | ✅ |
| `(admin)/layout.tsx` | Admin shell, auth check, module-aware nav | ✅ |
| `(admin)/admin/dashboard/*` | Module-aware admin dashboard | ✅ |
| `(admin)/admin/analytics/*` | Revenue/order/product/customer analytics | ✅ |
| `(admin)/admin/orders/*` | Admin order list/detail | ✅ |
| `(admin)/admin/products/*` | Product list/new/edit form | ✅ |
| `(admin)/admin/customers/*` | Customer list/detail and activate/deactivate | ✅ |
| `(admin)/admin/media/*` | Media library grid/list/upload/edit/delete | ✅ |
| `(admin)/admin/whatsapp/*` | WhatsApp manual send/templates/logs | ✅ |
| `(admin)/admin/blog/*` | Blog list/new/edit/category manager | ✅ |
| `(admin)/admin/cms/*` | CMS section list/toggle/detail editor | ✅ |
| `(admin)/admin/settings/*` | Module, localization, currency, site, payment, shipping, notification, OTP, external provider settings | ✅ |
| `checkout/*` | Checkout/payment/confirmation | ✅ |
| `sitemap.ts` | Module-aware XML sitemap | ✅ |
| `robots.ts` | Robots rules with sitemap link | ✅ |

### `src/app/api`

| Endpoint | Auth | Status |
|---|---|---|
| `GET /api/health` | None | ✅ |
| `POST /api/auth/login` | None | ✅ |
| `POST /api/auth/register` | None | ✅ |
| `POST /api/auth/forgot-password` | None | ✅ |
| `POST /api/auth/reset-password` | None | ✅ |
| `POST /api/auth/verify-email` | None | ✅ |
| `POST /api/auth/resend-verification` | None | ✅ |
| `GET /api/auth/me` | Customer/admin | ✅ |
| `POST /api/auth/logout` | None | ✅ |
| `GET/PATCH /api/notifications` | Customer/admin | ✅ |
| `POST /api/notifications/push-subscriptions` | Customer/admin | ✅ storage only |
| `GET /api/products` | None | ✅ |
| `GET /api/products/[slug]` | None | ✅ |
| `POST /api/orders` | Optional | ✅ |
| `POST /api/orders/[id]/upload-proof` | Signed order token | ✅ |
| `GET /api/customer/orders` | Customer | ✅ |
| `GET /api/customer/orders/[id]` | Customer | ✅ |
| `GET/PATCH /api/customer/profile` | Customer | ✅ |
| `POST/DELETE /api/customer/addresses` | Customer | ✅ |
| `GET /api/blog` | None | ✅ |
| `GET /api/blog/[slug]` | None | ✅ |
| `GET /api/cms` | None | ✅ |
| `POST /api/media/upload` | Admin | ✅ |
| `GET /api/admin/analytics` | Admin | ✅ |
| `GET /api/admin/analytics/dashboard` | Admin | ✅ module-aware |
| `GET/PATCH /api/admin/orders/[id]` | Admin | ✅ |
| `GET /api/admin/orders` | Admin | ✅ |
| `GET/POST /api/admin/products` | Admin | ✅ |
| `GET/PUT/DELETE /api/admin/products/[id]` | Admin | ✅ |
| `GET /api/admin/customers` | Admin | ✅ |
| `GET/PATCH /api/admin/customers/[id]` | Admin | ✅ |
| `GET /api/admin/media` | Admin | ✅ |
| `GET/PATCH/DELETE /api/admin/media/[id]` | Admin | ✅ |
| `GET/PATCH/POST /api/admin/whatsapp` | Admin | ✅ |
| `POST /api/admin/orders/[id]/whatsapp` | Admin | ✅ |
| `GET/POST /api/admin/blog` | Admin | ✅ |
| `GET/PATCH/DELETE /api/admin/blog/[id]` | Admin | ✅ |
| `GET/POST/PATCH/DELETE /api/admin/blog/categories` | Admin | ✅ |
| `GET /api/admin/cms` | Admin | ✅ |
| `GET/PUT /api/admin/cms/[sectionKey]` | Admin | ✅ API |
| `GET/PATCH /api/admin/config` | Admin | ✅ |

### `src/components`

| Path | Purpose |
|---|---|
| `ui/Button` | Button primitive |
| `ui/Card` | Card primitive |
| `ui/Input` | Input/Textarea/Select primitives |
| `ui/Modal` | Modal primitive |
| `ui/Toast` | Toast provider/hook |
| `ui/Badge` | Status/category badges |
| `ui/Spinner` | Loading spinner |
| `ui/Logo` | Brand mark |
| `layout/CustomerHeader` | Public/customer top nav and cart trigger |
| `layout/AdminSidebar` | Module-aware admin sidebar |
| `layout/Footer` | Footer |
| `shop/ProductCard` | Product card |
| `shop/Cart/CartContext.tsx` | Cart state and localStorage |
| `shop/CartDrawer` | Slide-out cart |
| `shop/EcommerceHeaderActions.tsx` | Dynamically imported cart trigger/drawer for E-Commerce-enabled public shell |
| `media/MediaUploader` | Drag/drop upload component |
| `checkout/OrderTimeline` | Customer/admin order timeline |
| `ComingSoon` | `/coming-soon` page |

### `src/lib`

| File | Purpose |
|---|---|
| `db/index.ts` | PostgreSQL pool and Drizzle db |
| `db/schema.ts` | Tables and inferred types |
| `db/seed.ts` | Admin/products/CMS/blog category seed |
| `db/indexes.ts` | 42 performance indexes |
| `redis.ts` | Redis client with `an:` keyPrefix |
| `cache.ts` | Cache helpers and invalidation |
| `config.ts` | DB-backed site config, env fallback helpers, and secret encryption |
| `modules.ts` | Module manifest, state helpers, nav helpers, page/API gates |
| `auth.ts` | JWT and cookie helpers |
| `otp.ts` | Hashed OTP creation/verification and auth email templates |
| `notifications.ts` | Notification provider facade, Resend sending, in-app notifications, delivery logs |
| `rate-limit.ts` | Redis fixed-window request limiting |
| `middleware.ts` | API guards |
| `errors.ts` | AppError and API error handling |
| `media.ts` | Local upload and Cloudflare R2 signed upload helper |
| `media-references.ts` | Media reference lookup for guarded deletes |
| `payment/types.ts` | Gateway contract |
| `payment/offline-qr.ts` | Offline QR gateway |
| `payment/index.ts` | Gateway registry |
| `order-number.ts` | `AN-YYYY-NNNN` sequence |
| `whatsapp.ts` | WhatsApp config, templates, sending, and delivery logging |
| `email.ts` | Backward-compatible email wrapper over notification provider facade |
| `observability.ts` | Sentry envelope capture with DB config/env fallback |
| `upload-token.ts` | Signed payment proof upload token helper |
| `sanitize.ts` | Allow-list HTML sanitizer for admin-authored rich content |
| `utils.ts` | Shared formatting/slug helpers |

---

## Cache Keys

Use unprefixed keys in code:

```txt
query:products:*
query:product:*
query:related:*
query:blog:*
query:cms:*
query:testimonials:*
config:*
page:*
```

ioredis stores them as `an:<key>`.

---

## Critical Production TODO

- 🔴 Forced seed admin password change.
- 🔴 Configure real production credentials in Admin Settings or env fallback.
- 🟡 Keep deep module package isolation mandatory before adding future heavy MLM/payment plugins.
- 🟡 Actual SMS/Telegram/Web Push sender adapters need final provider selection.
