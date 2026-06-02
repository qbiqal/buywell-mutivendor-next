# APRAS Naturals — AI Agent Reference

> Last updated: 2026-06-02
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
7. Core must stay lightweight. CMS, SEO, E-Commerce, Blog, and payment gateways are target modules.
8. Keep `/` module-aware: when CMS is disabled it redirects to `/login`; Coming Soon stays at `/coming-soon`.
9. Use `page.tsx` as the server shell and `*Client.tsx` for interactivity.
10. Run `npm run verify` after meaningful source changes unless the change is docs-only.

---

## Current Status

### Complete and Build-Verified

- ✅ Local PostgreSQL database created and initialized.
- ✅ Redis connectivity verified.
- ✅ Migrations, seed, config seed, and indexes applied locally.
- ✅ Production startup runs migrations plus idempotent config/content seeds; the content seed fills missing policy pages, compliance checks, and nested public menu links without running the local bootstrap seed.
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
- ✅ Admin analytics with revenue/orders/payment/product/customer charts, first-party traffic analytics, Today/2D filters, CSV export, and print-to-PDF export.
- ✅ Shared admin datatable CSV and print-to-PDF exports on products, orders, customers, and blog.
- ✅ Admin WhatsApp panel with WAHA/Meta provider selection, manual send, template manager, order resend API/buttons, wallet-gated sending, and delivery logs.
- ✅ Auth recovery flow: forgot password, reset password, email verification, resend verification.
- ✅ Core notification/OTP provider layer with Resend email gateway, in-app notifications, notification wallets, delivery logs, and push subscription storage.
- ✅ Qbiqal super-admin role for crediting WhatsApp, email, and SMS notification wallets.
- ✅ Admin provider key provisions for Resend, SMS, Telegram, Web Push, WhatsApp, R2, Razorpay, Stripe, and Sentry; DB config is primary and `.env` is fallback.
- ✅ Secret config encryption at rest for provider/API keys.
- ✅ SEO module with sitewide metadata settings, route overrides, verification codes, GTM/GA/Meta Pixel config, sitemap/robots controls, internal links, and search submission log.
- ✅ Dynamic sitemap and robots include CMS pages and SEO settings.
- ✅ Redis rate limiting for login/register/recovery attempts.
- ✅ Same-site API mutation hardening in `proxy.ts`.
- ✅ Sentry server-side capture path with DB config/env fallback.
- ✅ Rich HTML sanitization for blog content and product long descriptions.
- ✅ CMS page creator/editor and menu manager for landing header, other-pages header, and footer menus, including nested submenu support via `cms_menu_items.parent_item_id`.
- ✅ CMS page editor has reusable on-page SEO panel, module visibility, policy type, OG image crop upload, keywords, canonical URL, and robots controls.
- ✅ CMS section editor uses a structured content builder for text, numbers, booleans, arrays, nested objects, and media URL fields, with JSON kept as advanced fallback.
- ✅ Policy CMS pages seeded for terms, privacy, DPDP/GDPR data protection and consent, refund, return/replacement, cancellation, shipping, and cookies with module-aware visibility.
- ✅ Module control plane for Core, CMS, SEO, Blog, E-Commerce, and Offline QR.
- ✅ Admin settings are grouped into tabs for modules, brand, notifications, OTP, providers, localization, and commerce.
- ✅ Admin module toggles, locked Core toggle, brand logo uploaders, localization, currency, notification, OTP, and Resend settings.
- ✅ Admin logo uploader crops to 144x144 and website logo uploader crops to 360x96 through `MediaUploader`, with saved-logo clear buttons and crop-modal reset.
- ✅ Landing page custom topbar/drawer now reflects the uploaded website logo, and admin mobile sidebar behaves as a closed native drawer.
- ✅ Blog editor has nested categories, on-the-fly category creation, colorful tag suggestions/creation, and full SEO controls.
- ✅ Product editor has nested product categories, on-the-fly category creation, colorful tags, and full SEO controls.
- ✅ Blog comments support member-only comments/replies, likes, approval workflow, and English/Hindi abuse filtering.
- ✅ Product reviews support member-only review submission, likes, and admin approval workflow.
- ✅ E-Commerce refunds include customer refund request creation and admin requested/review/approved/rejected/processed workflow with event history.
- ✅ Core compliance admin page tracks GDPR/DPDP checklist status, evidence, policy coverage, and module visibility with 18 seeded readiness checks.
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
| `order-number.ts` | `AN-YYYY-NNNN` sequence |
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
