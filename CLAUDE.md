# BuyWell Multivendor Marketplace — AI Agent Reference

> Last updated: 2026-06-18
> Framework: Next.js 16.2.2
> DB: PostgreSQL 17
> Cache: Redis 7 with `bw:` prefix
> Current route policy: `/` is the multi-vendor landing page; `/vendor` is the vendor portal.

---

## Strict Rules

1. Git commits must use `Qbiqal <qbiqal.official@gmail.com>`.
2. No external UI libraries: no shadcn, Radix, Tailwind UI, or component kits.
3. Read Next.js docs from `node_modules/next/dist/docs/` before changing framework conventions.
4. Config must come from DB first via `src/lib/config.ts`; env is fallback only.
5. Redis keys must be passed without the `bw:` prefix because ioredis adds it through `keyPrefix`.
6. Payment must stay pluggable. Offline QR and Razorpay are primary gateways.
7. Core must stay lightweight. Multi-vendor, CMS, SEO, E-Commerce, and Blog are target modules.
8. Use `page.tsx` as the server shell and `*Client.tsx` for interactivity.
9. Run `npm run verify` after meaningful source changes unless the change is docs-only.

---

## Current Status

### Complete and Build-Verified (Part 1 Phases 0-6)

- ✅ Project rebranded to BuyWell Multivendor Marketplace (Phase 0).
- ✅ Redis key prefix updated to `bw:` for namespace isolation (Phase 0).
- ✅ New multi-vendor homepage with hero banner slider, category strip, and latest products (Phase 1).
- ✅ Admin homepage banner management UI and API (Phase 1).
- ✅ Multi-vendor database schema: `vendors`, `order_vendor_splits`, `vendor_commissions`, `vendor_payouts` (Phase 2).
- ✅ Vendor application flow at `/become-vendor` and admin approval UI (Phase 2).
- ✅ Vendor panel at `/vendor/*` with dashboard, product management, and order visibility (Phase 3).
- ✅ Multi-vendor order split logic and commission calculation on payment verification (Phase 4).
- ✅ Razorpay payment gateway integration with webhook support (Phase 5).
- ✅ Admin vendor management and payout processing (Phase 6).
- ✅ Admin `/admin/commissions` UI (Commission Statement) implemented (Phase 6).
- ✅ Phase 7: SEO polish, public vendor store pages (`/vendors/[slug]`), and vendor name visibility on product pages complete.
- ✅ Part 2: BuyWell Global Integration (E-Commerce Wallet + User Sync) complete.
- ✅ Verified `npm run verify` passes with all Part 1 & 2 features.
- ✅ Image upload persistence: local-storage fallback (`public/uploads/`) now survives redeploys via Docker named volume. R2 fallback logic also fixed (all 4 credentials must be present; partial config no longer silently fails with 500).
- ✅ Date+time in all data tables (admin/vendor/customer) — uses `formatDateTime` from `src/lib/utils.ts`.
- ✅ Reusable `ConfirmModal` component at `src/components/ui/ConfirmModal/` — replaces all `window.confirm()` calls.
- ✅ Vendor impersonation: admin can log in as any approved vendor from `/admin/vendors` → redirects to `/vendor/dashboard`.
- ✅ Customer impersonation redirect fixed: → `/orders` (was `/`).
- ✅ Vendor impersonation API: `POST /api/admin/vendors/[id]/impersonate`.
- ✅ Commission DELETE API: `DELETE /api/admin/commissions/[id]` — hard delete for bad records.
- ✅ Schema: `product_variants.imageUrl` (per-variant image), `vendors.adminRating/adminRatingNote`, new tables `vendor_ratings`, `tax_rates`, `hsn_codes`; `products.hsnCode/taxRateId`. Migration `0011_cold_butterfly.sql`.
- ✅ Variant-specific images: vendor/admin can set per-variant image; product detail page swaps image on variant select.
- ✅ Vendor section on product detail page: "Sold by [Vendor]" with star rating and customer rating form.
- ✅ Customer vendor rating: `POST /api/vendors/[slug]/rate` — one rating per user, updates `vendors.rating`.
- ✅ Admin vendor rating: admin sets 1-5 star rating + note from `/admin/vendors/[id]` detail page.
- ✅ Analytics vendor/product/date filters: `/admin/analytics` supports `vendorId`, `productName`, `dateFrom`, `dateTo`; shows vendor breakdown table.
- ✅ Indian GST module: `tax_rates` + `hsn_codes` tables seeded via `scripts/gst-seed.js` (runs on deploy). ~100 HSN codes, 9 tax rate brackets.
- ✅ GST fields in admin and vendor product forms: HSN code autocomplete + tax rate dropdown with CGST/SGST/IGST breakdown display.
- ✅ GST Report page at `/admin/gst`: date range + vendor filter, summary cards (taxable value, CGST, SGST, IGST), by-rate breakdown table, order detail, CSV export.
- ✅ GST report API: `GET /api/admin/gst/report` — back-calculates tax from product tax rates on verified orders.

### Production: Image Storage Setup

Media uploads use a **two-tier storage strategy**:

| Condition | Storage | Persistence |
|---|---|---|
| All R2 credentials configured | Cloudflare R2 | ☁️ R2 bucket |
| R2 not configured (fallback) | `public/uploads/` | 🗄️ Docker volume `nn399lysa851mtmlqy2xz8t7_uploads` mounted at `/app/public/uploads` |

**Coolify persistent volume** — added directly to `local_persistent_volumes` in Coolify's DB:
- uuid: `d3986j8x2oclms59q4xqtayj`
- name: `nn399lysa851mtmlqy2xz8t7_uploads`
- mount_path: `/app/public/uploads`
- resource_id: 21 (buywell-multivendor app)

**Never** edit Coolify's generated `/data/coolify/applications/nn399lysa851mtmlqy2xz8t7/docker-compose.yaml` directly — it is regenerated from the DB on every deploy. The volume record in Coolify's DB is what persists.

### Partial / Pending

- 🟡 Push subscription storage and provider config exist; actual Web Push sending depends on final provider/runtime choice.

---

## Architecture

```txt
Core
  auth, users, qbiqal super-admin, settings, notification wallets, notifications, OTP, media library, DB, Redis, cache, route protection, module registry, provider key config

Multivendor Module
  /vendor/*, /admin/vendors, /admin/payouts, vendors, order_vendor_splits, vendor_commissions, vendor_payouts, commissions, payouts

CMS Module
  / (homepage), /admin/homepage, homepage_banners, cms_sections, cms_pages, cms_menus, policy pages

SEO Module
  /admin/seo, reusable SEO panels, seo_page_overrides, sitemap/robots

E-Commerce Module
  /shop, /checkout, /orders, /profile, admin orders/products/customers/reviews/refunds

Blog Module
  /blog, /admin/blog, blog_posts, categories, comments
```

---

## File Index (Key Additions)

### Multivendor & Admin

| Path | Purpose |
|---|---|
| `src/app/(vendor)/*` | Vendor portal routes |
| `src/app/api/vendor/*` | Vendor portal APIs |
| `src/app/(admin)/admin/vendors/*` | Admin vendor management |
| `src/app/(admin)/admin/payouts/*` | Admin payout management |
| `src/app/(admin)/admin/homepage/*` | Admin homepage banner builder |
| `src/lib/vendor-commission.ts` | Commission split logic |
| `src/lib/payment/razorpay.ts` | Razorpay gateway |

---

## Cache Keys

Use unprefixed keys in code: `config:*`, `query:homepage:banners`, `query:products:*`, etc.
ioredis stores them as `bw:<key>`.

Latest verification completed on 2026-06-13.


---

## Local Setup

`.env.local` is local-only and ignored by git.

Useful local commands:

```bash
set -a; . ./.env.local; set +a
npm run db:migrate
npm run db:seed
node -e "require('./scripts/config-seed.js')().then(()=>console.log('config defaults seeded'))"
npm run db:content-seed
npm run db:indexes
npm run typecheck
npm run unit
npm run build
npm run smoke
npm run e2e
npm run verify
```

Local seed counts after audit:

| Table | Count |
|---|---:|
| users | 3 including admin, qbiqal, demo customer |
| products | 4 |
| product_variants | 9 |
| product_images | 12 |
| cms_sections | 14 |
| cms_menus | 3 |
| cms_menu_items | 30 |
| site_config | 110+ |
| otp_codes | 0 |
| notification_deliveries | 0 |
| notification_wallets | 3 |
| notification_wallet_transactions | 0 |
| push_subscriptions | 0 |
| whatsapp_logs | 0 |
| blog_categories | 5 |
| product_categories | 5 |
| content_tags | 7 |
| cms_pages | 8 policy pages seeded |
| compliance_checks | 18 |

---

## Architecture

```txt
Core
  auth, users, qbiqal super-admin, settings, notification wallets, notifications, OTP, media library, DB, Redis, cache, route protection, module registry, provider key config

CMS Module
  /home, /admin/cms, /admin/cms/pages, /admin/cms/menus, cms_sections, cms_pages, cms_menus, cms_menu_items.parent_item_id, testimonials, landing content, public CMS pages, policy pages, nested header/footer menus

SEO Module
  /admin/seo, reusable SEO panels, seo_page_overrides, seo_internal_links, seo_search_submissions, traffic_events, GTM/GA/Meta Pixel config, sitemap/robots controls

E-Commerce Module
  /shop, /checkout, /orders, /profile, admin orders/products/customers/reviews/refunds, products, nested categories, variants, orders, refunds, reviews

Blog Module
  /blog, /admin/blog, /admin/blog/comments, blog_posts, nested blog_categories, tags, comments, comment likes

Payment Submodules
  offline_qr now; Razorpay/Stripe/etc later
```

Implemented module behavior:

- Core cannot be disabled.
- CMS, SEO, E-Commerce, Blog, and Offline QR can be enabled/disabled from admin.
- Disabled modules hide public/admin nav, block pages/APIs, and skip e-commerce providers.
- Notification channels and OTP behavior are Core settings, not business modules.
- Current config keys: `module_cms_enabled`, `module_seo_enabled`, `module_ecommerce_enabled`, `module_blog_enabled`, `payment_offline_qr_enabled`.
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
| `scripts/startup.js` | Production startup: migrate, seed config/content defaults, start server |
| `scripts/config-seed.js` | Idempotent `site_config` defaults |
| `scripts/content-seed.js` | Idempotent production CMS policy/compliance/menu defaults |
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
| `(public)/[slug]/page.tsx` | Published CMS page renderer and page SEO metadata | ✅ |
| `(public)/LandingClient.tsx` | Landing renderer | ✅ |
| `(public)/shop/page.tsx` | Shop listing shell | ✅ |
| `(public)/shop/ShopClient.tsx` | Shop listing UI/filter | ✅ |
| `(public)/shop/[slug]/page.tsx` | Product detail shell/metadata | ✅ |
| `(public)/shop/[slug]/ProductDetailClient.tsx` | Product gallery/variant/cart UI | ✅ |
| `(public)/shop/[slug]/ProductReviews.tsx` | Member-only product reviews, likes, login prompt | ✅ |
| `(public)/blog/page.tsx` | Blog listing shell | ✅ |
| `(public)/blog/BlogListingClient.tsx` | Blog listing UI | ✅ |
| `(public)/blog/[slug]/page.tsx` | Blog detail | ✅ |
| `(public)/blog/[slug]/BlogComments.tsx` | Nested member comments, likes, login prompt | ✅ |
| `(auth)/login/*` | Login page/client | ✅ |
| `(auth)/register/*` | Register page/client | ✅ |
| `(auth)/forgot-password/*` | Forgot password request | ✅ |
| `(auth)/forget-password/*` | Typo alias redirect to forgot password | ✅ |
| `(auth)/reset-password/*` | Reset password with OTP | ✅ |
| `(auth)/verify-email/*` | Email verification with OTP | ✅ |
| `(customer)/layout.tsx` | Customer shell | ✅ |
| `(customer)/orders/*` | Customer order list/detail | ✅ |
| `(customer)/orders/[id]/OrderDetailClient.tsx` | Customer order detail with refund request form | ✅ |
| `(customer)/profile/*` | Profile, addresses, password | ✅ |
| `(customer)/notifications/*` | In-app notification center | ✅ |
| `(admin)/layout.tsx` | Admin shell, auth check, module-aware nav | ✅ |
| `(admin)/admin/dashboard/*` | Module-aware admin dashboard | ✅ |
| `(admin)/admin/analytics/*` | Revenue/order/product/customer and first-party traffic analytics | ✅ |
| `(admin)/admin/refunds/*` | Refund workflow management | ✅ |
| `(admin)/admin/reviews/*` | Product review moderation | ✅ |
| `(admin)/admin/orders/*` | Admin order list/detail | ✅ |
| `(admin)/admin/products/*` | Product list/new/edit form | ✅ |
| `(admin)/admin/customers/*` | Customer list/detail and activate/deactivate | ✅ |
| `(admin)/admin/media/*` | Media library grid/list/upload/edit/delete | ✅ |
| `(admin)/admin/whatsapp/*` | WAHA/Meta WhatsApp config, manual send/templates/logs | ✅ |
| `(admin)/admin/notification-wallets/*` | Qbiqal-only WhatsApp/email/SMS wallet crediting and ledger | ✅ |
| `(admin)/admin/blog/*` | Blog list/new/edit/category manager | ✅ |
| `(admin)/admin/blog/comments/*` | Blog comment moderation | ✅ |
| `(admin)/admin/cms/*` | CMS section list/toggle/detail editor, page editor, menu manager | ✅ |
| `(admin)/admin/seo/*` | SEO, analytics tags, route overrides, internal links, search submissions | ✅ |
| `(admin)/admin/compliance/*` | GDPR/DPDP checklist, evidence, policy visibility | ✅ |
| `(admin)/admin/settings/*` | Module, brand logos, localization, currency, site, payment, shipping, notification, OTP, external provider settings | ✅ |
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
| `GET/POST /api/products/[slug]/reviews` | Public GET, customer POST | ✅ |
| `POST /api/products/reviews/[id]/like` | Customer | ✅ |
| `POST /api/orders` | Optional | ✅ |
| `POST /api/orders/[id]/upload-proof` | Signed order token | ✅ |
| `GET /api/customer/orders` | Customer | ✅ |
| `GET /api/customer/orders/[id]` | Customer | ✅ |
| `GET/POST /api/customer/refunds` | Customer | ✅ |
| `GET/PATCH /api/customer/profile` | Customer | ✅ |
| `POST/DELETE /api/customer/addresses` | Customer | ✅ |
| `GET /api/blog` | None | ✅ |
| `GET /api/blog/[slug]` | None | ✅ |
| `GET/POST /api/blog/[slug]/comments` | Public GET, customer POST | ✅ |
| `POST /api/blog/comments/[id]/like` | Customer | ✅ |
| `GET /api/cms` | None | ✅ |
| `POST /api/media/upload` | Admin | ✅ |
| `GET /api/admin/analytics` | Admin | ✅ |
| `GET /api/admin/analytics/dashboard` | Admin | ✅ module-aware |
| `POST /api/analytics/traffic` | None | ✅ first-party public page views |
| `GET/PATCH /api/admin/orders/[id]` | Admin | ✅ |
| `GET /api/admin/orders` | Admin | ✅ |
| `GET/POST /api/admin/products` | Admin | ✅ |
| `GET/PUT/DELETE /api/admin/products/[id]` | Admin | ✅ |
| `GET/POST/PATCH/DELETE /api/admin/products/categories` | Admin | ✅ |
| `GET/PATCH /api/admin/reviews` | Admin | ✅ |
| `GET/PATCH /api/admin/refunds` | Admin | ✅ |
| `GET /api/admin/customers` | Admin | ✅ |
| `GET/PATCH /api/admin/customers/[id]` | Admin | ✅ |
| `GET /api/admin/media` | Admin | ✅ |
| `GET/PATCH/DELETE /api/admin/media/[id]` | Admin | ✅ |
| `GET/PATCH/POST /api/admin/whatsapp` | Admin | ✅ |
| `GET/POST /api/admin/notification-wallets` | Admin GET, qbiqal POST | ✅ |
| `POST /api/admin/orders/[id]/whatsapp` | Admin | ✅ |
| `GET/POST /api/admin/blog` | Admin | ✅ |
| `GET/PATCH/DELETE /api/admin/blog/[id]` | Admin | ✅ |
| `GET/POST/PATCH/DELETE /api/admin/blog/categories` | Admin | ✅ |
| `GET/PATCH /api/admin/blog/comments` | Admin | ✅ |
| `GET /api/admin/cms` | Admin | ✅ |
| `GET/PUT /api/admin/cms/[sectionKey]` | Admin | ✅ API |
| `GET/POST /api/admin/cms/pages` | Admin | ✅ |
| `GET/PATCH/DELETE /api/admin/cms/pages/[id]` | Admin | ✅ |
| `GET/PATCH /api/admin/cms/menus` | Admin | ✅ |
| `GET/PATCH/POST /api/admin/seo` | Admin | ✅ |
| `GET/PATCH /api/admin/compliance` | Admin | ✅ |
| `GET/POST /api/admin/tags` | Admin | ✅ |
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
| `admin/TagSelector` | Color chip tag selector with suggestions and one-click create |
| `admin/NestedCategoryPicker` | Nested category select and inline child category creation |
| `admin/SeoPanel` | Shared meta title/description/keywords/canonical/OG/robots panel |
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
| `db/seed.ts` | Admin/qbiqal/customer/products/CMS/blog/category/config/wallet seed |
| `db/indexes.ts` | 57 performance indexes |
| `redis.ts` | Redis client with `an:` keyPrefix |
| `cache.ts` | Cache helpers and invalidation |
| `config.ts` | DB-backed site config, env fallback helpers, and secret encryption |
| `modules.ts` | Module manifest, state helpers, role-aware nav helpers, page/API gates |
| `moderation.ts` | English/Hindi abuse keyword filter for comments and reviews |
| `auth.ts` | JWT and cookie helpers |
| `otp.ts` | Hashed OTP creation/verification and auth email templates |
| `notifications.ts` | Notification provider facade, wallet-gated Resend sending, in-app notifications, delivery logs |
| `notification-wallet.ts` | WhatsApp/email/SMS wallet balances, atomic debit, credit, and reversal helpers |
| `rate-limit.ts` | Redis fixed-window request limiting |
| `middleware.ts` | API guards |
| `errors.ts` | AppError and API error handling |
| `media.ts` | Local upload and Cloudflare R2 signed upload helper |
| `media-references.ts` | Media reference lookup for guarded deletes |
| `payment/types.ts` | Gateway contract |
| `payment/offline-qr.ts` | Offline QR gateway |
| `payment/index.ts` | Gateway registry |
| `order-number.ts` | `BW-YYYY-NNNN` sequence |
| `whatsapp.ts` | WAHA/Meta WhatsApp config, templates, wallet-gated sending, and delivery logging |
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
query:cms:pages:*
query:cms:menus:*
query:seo:*
query:traffic:*
query:testimonials:*
config:*
page:*
```

ioredis stores them as `an:<key>`.

Important invalidation groups:

- `cacheInvalidate.config()` plus `revalidateSiteShell()` refresh logo, brand, public shell, sitemap, and robots consumers.
- `cacheInvalidate.cmsPages()` refreshes CMS page queries and affected public slugs.
- `cacheInvalidate.menus()` refreshes header/footer menu consumers.
- `cacheInvalidate.seo()` refreshes SEO overrides, sitemap, and robots.
- `cacheInvalidate.traffic()` refreshes admin traffic analytics.

Latest local verification completed on 2026-06-02:

```bash
npm run db:generate
set -a; source .env.local; set +a; npm run db:migrate
npm run db:seed
npm run db:indexes
npm run typecheck
npm run unit
npm run build
npm run smoke
npm run e2e
```

---

## Critical Production TODO

- 🔴 Forced seed admin and qbiqal password changes.
- 🔴 Configure real production credentials in Admin Settings or env fallback.
- 🟡 Keep deep module package isolation mandatory before adding future heavy MLM/payment plugins.
- 🟡 Actual SMS/Telegram/Web Push sender adapters need final provider selection.
