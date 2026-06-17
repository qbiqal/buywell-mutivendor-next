# BuyWell Marketplace Roadmap

> Last audited: 2026-05-30
> Current mode: CMS landing is live at `/`; `/home` is retained as an alias; Coming Soon is retained at `/coming-soon`.
> Local verification: PostgreSQL DB created, migrations applied, seed data loaded, Redis connected, indexes created, `npm run verify` passes.

---

## Status Legend

- ✅ Complete and build-verified
- 🟡 Partial / usable but needs production hardening
- ❌ Pending
- 🔴 Must fix before production

---

## Current Route Decision

| Route | Current Purpose | Status |
|---|---|---|
| `/` | Full CMS-driven landing page | ✅ Active route |
| `/home` | Full CMS-driven landing alias | ✅ Backward-compatible route |
| `/coming-soon` | Previous Coming Soon page | ✅ Retained |
| `/shop` | Public product listing | ✅ |
| `/shop/[slug]` | Product detail page | ✅ |
| `/blog` | Public blog listing | ✅ |
| `/blog/[slug]` | Public blog detail | ✅ |
| `/checkout` | Cart checkout / sample request | ✅ |
| `/checkout/payment` | Offline QR payment proof upload | ✅ |
| `/checkout/confirmation` | Post-upload confirmation | ✅ |
| `/orders`, `/orders/[id]` | Customer portal orders | ✅ |
| `/profile` | Customer profile and addresses | ✅ |
| `/admin/dashboard` | Admin summary | ✅ |
| `/admin/orders`, `/admin/orders/[id]` | Admin order management | ✅ |
| `/admin/products` | Product management | ✅ |
| `/admin/blog` | Blog management | ✅ |
| `/admin/cms` | Landing section list, enable/disable, and JSON config editor | ✅ |
| `/admin/settings` | Site/payment/shipping/module/localization/currency config | ✅ |
| `/admin/customers`, `/admin/customers/[id]` | Customer management | ✅ |
| `/admin/media` | Media library browser | ✅ |
| `/admin/analytics` | Full analytics dashboard | ✅ |
| `/admin/whatsapp` | Manual WhatsApp operations | ✅ |
| `/forgot-password`, `/forget-password` | Password reset request, typo alias redirects | ✅ |
| `/reset-password` | Password reset with OTP code | ✅ |
| `/verify-email` | Registration email verification with OTP code | ✅ |
| `/notifications` | Customer in-app notification center | ✅ |

---

## Module Architecture Target

The platform should remain a **Next.js-first modular monolith**. Do not introduce NestJS for the main app right now. For this business model, every deployment is single-tenant for one client, so a separate backend runtime would add boilerplate and memory cost without enough benefit.

Use NestJS or a separate service later only for heavy domain engines such as MLM ledgers, commission processing, payout queues, or external API surfaces that genuinely need to scale independently.

Core is always loaded. Business modules are enabled/disabled through admin settings and must be isolated so unused modules do not initialize background services, heavy dependencies, client providers, admin navigation, public navigation, payment gateways, or API behavior.

### Non-Negotiable Module Rules

1. Core cannot be disabled.
2. Disabled modules must not show public nav items.
3. Disabled modules must not show admin nav items.
4. Disabled modules must return disabled/404 behavior from pages and APIs.
5. Disabled modules must not register gateways, jobs, or service clients.
6. A CMS-only install must not load cart/order/payment providers.
7. A Blog-only install must not load e-commerce/cart/payment behavior.
8. Every module must provide seed defaults so a DB reset returns to a complete working baseline.
9. Every finished phase must update `docs/roadmap.md`, `CLAUDE.md`, and `docs/mind-map.md`.
10. Every finished phase must run build plus smoke/E2E checks.

### Initial Modules

| Module | Can Disable? | Current State | Required Capability |
|---|---:|---|---|
| Core | No | ✅ Built and locked on | Auth, users, settings, layout, health, DB, Redis, cache, module registry, notifications, OTP, provider key config |
| CMS | Yes | ✅ Built and module-gated | `/`, `/home`, CMS sections, testimonials, media-driven landing content |
| E-Commerce | Yes | ✅ Built and module-gated | Shop, cart, checkout, orders, products, customers, customer orders |
| Blog | Yes | ✅ Built and module-gated | Blog listing/detail, admin blog CRUD |
| Payment: Offline QR | Yes | ✅ Built with admin toggle | QR config, payment proof upload, admin verification |

### Target Runtime Pattern

1. Core starts first and reads module state from DB-backed config.
2. Navigation is generated from enabled module manifests.
3. Public/admin route shells check module state and return 404 or disabled screen when a module is off.
4. Module services are loaded lazily through dynamic imports.
5. Payment gateways are submodules under E-Commerce and registered only when enabled.
6. Future modules add a manifest, DB config defaults, admin settings UI, route group, API group, and optional migration.
7. Locale and currency settings live in Core, while modules decide where those values apply.
8. Current implementation uses `src/lib/modules.ts`; current heavy client surfaces such as cart provider/header actions are dynamically imported only when E-Commerce is enabled. Future MLM/payment engines should use `src/modules/<module>/` folders and dynamic service imports from day one.

### Install Profiles

| Profile | Enabled Modules | Runtime Expectation |
|---|---|---|
| CMS-only | Core + CMS | No cart provider/header cart action, no shop/order/admin commerce nav, no payment gateway work. |
| Blog-only | Core + Blog | No CMS homepage sections unless CMS is enabled, no cart/order/payment behavior. |
| CMS + Blog | Core + CMS + Blog | Content and blog routes only; e-commerce providers remain unloaded. |
| CMS + Blog + E-Commerce | Core + CMS + Blog + E-Commerce | Cart, checkout, orders, products, customers, analytics, and enabled payment gateways load. |
| Future MLM | Core + selected MLM module | MLM engine must be isolated under its own module folder and loaded only when enabled. |
| Future payment gateway | E-Commerce + selected gateway | Gateway adapter must be registered only when its config toggle and E-Commerce are enabled. |

### Notification and OTP Provider Architecture

Notifications and OTP are Core subsystems, not separate business modules. They must stay light enough for CMS-only installs, while allowing providers to be added later without touching auth flows.

Current shape:

- ✅ `src/lib/notifications.ts` owns provider config, delivery logging, in-app notifications, and email gateway routing.
- ✅ Resend is the first email provider and reads its API key from Admin Settings (`notification_resend_api_key`) with `RESEND_API_KEY` as fallback.
- ✅ `src/lib/otp.ts` owns hashed one-time codes for email verification and password reset.
- ✅ In-app notifications are stored in `notifications`.
- ✅ Cross-channel delivery attempts are stored in `notification_deliveries`.
- ✅ Push subscriptions are provisioned in `push_subscriptions`; actual Web Push sending is pending.
- ✅ SMS, WhatsApp, Telegram, and push have admin toggles/provider keys so adapters can be added later.
- ✅ Provider secrets can be entered from Admin Settings; `.env` values are fallback only when DB config is empty.
- ✅ Secret config values are encrypted at rest when `CONFIG_ENCRYPTION_KEY`, `APP_CONFIG_ENCRYPTION_KEY`, or `JWT_SECRET` is present.

Provider rules:

1. Auth flows call the notification/OTP facade, never a provider directly.
2. Every provider adapter must be gated by DB-backed config.
3. Missing provider credentials must skip/log locally instead of breaking registration or password reset.
4. Provider delivery status must be logged for audit/debug.
5. Future providers should be added as adapters under Core or the owning module and registered only when enabled.

Notification config keys:

| Key | Meaning |
|---|---|
| `notification_in_app_enabled` | Enables DB-backed in-app notifications |
| `notification_email_enabled` | Enables email notification channel |
| `notification_email_provider` | Active email provider, currently `resend` |
| `notification_email_from` | Sender used by outbound email |
| `notification_resend_enabled` | Enables Resend provider |
| `notification_resend_api_key` | Resend API key configured from admin |
| `notification_sms_enabled` | Future SMS channel switch |
| `notification_sms_provider` | Future SMS provider key |
| `notification_sms_api_key` | Future SMS API key with env fallback |
| `notification_sms_sender_id` | Future SMS sender ID with env fallback |
| `notification_sms_auth_token` | Future SMS auth token with env fallback |
| `notification_whatsapp_enabled` | Shared WhatsApp channel switch |
| `notification_telegram_enabled` | Future Telegram channel switch |
| `notification_telegram_bot_token` | Future Telegram bot token with env fallback |
| `notification_telegram_chat_id` | Future Telegram chat ID with env fallback |
| `notification_push_enabled` | Future push channel switch |
| `notification_push_provider` | Push provider key, currently `web_push` |
| `notification_push_vapid_public_key` | Web Push public key with env fallback |
| `notification_push_vapid_private_key` | Web Push private key with env fallback |
| `notification_push_vapid_subject` | Web Push subject with env fallback |

OTP config keys:

| Key | Meaning |
|---|---|
| `otp_email_enabled` | Master switch for email OTP |
| `otp_email_verification_enabled` | Sends registration verification codes |
| `otp_password_reset_enabled` | Sends forgot-password reset codes |
| `otp_email_verification_ttl_minutes` | Verification code expiry |
| `otp_password_reset_ttl_minutes` | Reset code expiry |
| `otp_max_attempts` | Maximum failed attempts before code is consumed |

### Proposed Module Manifest

```ts
export interface AppModule {
  key: "core" | "cms" | "ecommerce" | "blog" | string;
  name: string;
  canDisable: boolean;
  defaultEnabled: boolean;
  nav?: {
    public?: Array<{ label: string; href: string }>;
    admin?: Array<{ label: string; href: string; icon: string }>;
  };
  dependencies?: string[];
}
```

### Required Module Tables / Config

The lightest first implementation can use `site_config` keys:

| Key | Meaning |
|---|---|
| `module_core_enabled` | Always `true`; admin cannot edit |
| `module_cms_enabled` | Enables `/home`, CMS admin, CMS API |
| `module_ecommerce_enabled` | Enables shop/cart/checkout/orders/products |
| `module_blog_enabled` | Enables public blog and admin blog |
| `payment_offline_qr_enabled` | Enables Offline QR gateway |

A later stronger version can add `modules` and `payment_gateways` tables if module metadata outgrows `site_config`.

### Multilingual and Multicurrency Baseline

Core owns locale and currency configuration even when CMS/Blog/E-Commerce are disabled.

| Key | Meaning |
|---|---|
| `locale_default` | Default locale, initially `en` |
| `locales_enabled` | Comma-separated enabled locales, initially `en,hi` |
| `currency_default` | Default currency, initially `INR` |
| `currencies_enabled` | Comma-separated enabled currencies, initially `INR` |
| `currency_rates_json` | JSON conversion map relative to INR, initially `{ "INR": 1 }` |

Implementation direction:

- CMS fields should eventually support translated content per locale.
- Blog posts should eventually support locale-specific slugs/content.
- E-Commerce prices remain stored in base paise for INR first; display conversion can be layered through currency config.
- Payment gateways must declare supported currencies.

---

## Completed Work

### Landing / CMS Homepage

- ✅ `/` now renders the CMS landing page when the CMS module is enabled.
- ✅ `/home` remains an alias for the same landing page.
- ✅ `/coming-soon` retains the previous Coming Soon experience.
- ✅ Landing hero uses the uploaded CMS hero video directly with no heading/subheading intro layer and no visual overlay.
- ✅ Hero video stays paused on load and only advances frames from scroll position.
- ✅ Contact section replaces the legacy order enquiry section; ecommerce remains responsible for ordering.
- ✅ Landing footer upgraded with a stronger contact CTA and product trust chips.

### Product UX / Admin Tables / Theme

- ✅ Product detail page now has an Amazon/Flipkart-style horizontal thumbnail carousel below the featured image.
- ✅ Clicking a thumbnail swaps the featured product image.
- ✅ Product detail falls back to product/category-specific local assets if DB images are missing.
- ✅ Admin users see an edit-product shortcut from the product detail breadcrumb.
- ✅ Seed now creates 12 product image rows across honey and ghee products.
- ✅ Reusable `DataTableFilters` component added for admin CRUD tables.
- ✅ `/admin/products` filters: search, category, status, featured, created date range, price range, stock range.
- ✅ `/admin/customers` filters: search, active status, email verification, joined date range, order count, lifetime spend.
- ✅ `/admin/orders` filters: search, order status, payment status, order type, date range, amount range.
- ✅ `/admin/blog` filters: search, publish status, category, featured state, created date range, views, and read time.
- ✅ Public Sans is now the global font through `next/font`.
- ✅ Admin topbar includes a persisted dark mode switch; CSS variables make existing surfaces dark-mode ready.

### Foundation

- ✅ Next.js 16.2.2 App Router project with TypeScript.
- ✅ Custom CSS Modules and CSS variables, no shadcn/Radix/Tailwind UI.
- ✅ Dockerfile with standalone output.
- ✅ Startup script for migrations and config seed.
- ✅ Health API exists.
- ✅ Redis client uses `an:` key prefix.
- ✅ CodeGraph initialized.
- ✅ `npm run verify` script added for build, smoke, and live E2E.

### Local Development Environment

- ✅ Local PostgreSQL role `bw_user` created.
- ✅ Local database `buywell_multivendor_new` created.
- ✅ `.env.local` created for local DB, Redis, JWT, and app URL.
- ✅ Drizzle migrations applied locally.
- ✅ Seed data loaded: 1 admin, 4 products, 9 variants, 12 product images, 14 CMS sections, 4 blog categories, 90 config keys.
- ✅ 42 performance indexes created locally.
- ✅ Redis local ping verified.

### Core

- ✅ DB schema includes users, addresses, products, variants, images, orders, order items, order history, blog, media, site config, CMS sections, testimonials, notifications, notification deliveries, OTP codes, push subscriptions, WhatsApp logs, order sequence.
- ✅ JWT cookie auth via `bw_token`.
- ✅ Admin/customer guards for API routes.
- ✅ Register, login, forgot password, reset password, email verification, and resend verification APIs.
- ✅ Registration sends email verification OTP through notification provider facade.
- ✅ Forgot/reset password uses hashed OTP codes and Resend-backed email delivery.
- ✅ Redis rate limiting on login, register, forgot password, and resend verification.
- ✅ Customer notification center and notification API.
- ✅ Push subscription storage API for future Web Push sends.
- ✅ Next 16 `proxy.ts` route protection.
- ✅ Error wrapper and API response convention.
- ✅ DB-backed config helpers.
- ✅ Secret config encryption for provider/API keys.
- ✅ DB-first provider configuration with `.env` fallback for external keys.
- ✅ Redis cache helper and prefix invalidation.
- ✅ Module registry/state helpers in `src/lib/modules.ts`.
- ✅ Module-aware admin/public navigation.
- ✅ Module-aware root providers; CartProvider and cart header actions are dynamically imported only when E-Commerce is enabled.
- ✅ Admin settings include module toggles, locked Core, localization, currency, and Offline QR gateway toggle.
- ✅ Admin settings include notification gateway toggles, Resend/SMS/Telegram/Web Push keys, external provider keys, and OTP TTL/attempt controls.
- ✅ Same-site mutation hardening for API POST/PATCH/PUT/DELETE requests.
- ✅ Lightweight Sentry envelope reporting with DB config and env fallback.
- ✅ Allow-list HTML sanitization for blog content and product long descriptions.

### CMS

- ✅ CMS sections table and seeded section keys.
- ✅ `/home` reads CMS sections, general site config, featured products, testimonials, and recent blog posts.
- ✅ `/admin/cms` lists sections and toggles enabled state.
- ✅ `/admin/cms/[sectionKey]` edits section enabled state, sort order, and JSON config.
- ✅ CMS public/admin pages and APIs are gated by `module_cms_enabled`.

### E-Commerce

- ✅ Product listing API and `/shop`.
- ✅ Product detail API and `/shop/[slug]`.
- ✅ Product cards and cart context with localStorage persistence.
- ✅ CartDrawer integrated into CustomerHeader.
- ✅ Checkout form supports cart order and free sample request.
- ✅ Order creation stores snapshots and status history.
- ✅ Order creation recalculates prices server-side and atomically decrements variant stock.
- ✅ Payment proof upload stores locally in dev or R2 in production.
- ✅ Payment proof upload requires signed order-scoped upload token.
- ✅ Admin order list/detail/status update.
- ✅ Admin product list/new/edit/delete with variants and images.
- ✅ Product variant edits preserve historical ordered variants; deleting a used product archives/deactivates it instead of breaking orders.
- ✅ Admin customer list/detail with search, pagination, spend/order stats, addresses, recent orders, and deactivate/reactivate.
- ✅ Customer order list/detail with timeline.
- ✅ Customer profile, password change, address add/delete.
- ✅ E-Commerce pages, APIs, customer routes, checkout, cart provider, products, and orders are gated by `module_ecommerce_enabled`.

### Blog

- ✅ Public blog list/detail APIs and pages.
- ✅ Admin blog list, new, edit, delete.
- ✅ Rich content editor and cover image upload.
- ✅ Publish status and cache invalidation.
- ✅ Blog category admin UI/API for create, rename, and guarded delete.
- ✅ Blog admin uses the shared `DataTableFilters` panel with server-side search/status/category/date/views/read-time filters.
- ✅ Blog public/admin pages and APIs are gated by `module_blog_enabled`.

### Payment

- ✅ `PaymentGateway` interface exists.
- ✅ Offline QR gateway implemented.
- ✅ Payment QR/UPI/company fields stored in `site_config`.
- ✅ Admin settings allow QR upload and UPI/company editing.
- ✅ Offline QR can be enabled/disabled from Admin Settings using `payment_offline_qr_enabled`.
- ✅ Checkout/order creation calls the gateway registry end-to-end and stores the selected gateway on the order.

### Media

- ✅ `MediaUploader` component is reusable across product/blog/settings flows.
- ✅ `/api/media/upload` saves metadata to DB and now requires admin auth.
- ✅ `/admin/media` grid/list browser with folder/type/search filters, upload, preview, copy URL, alt/folder edit, and guarded delete.
- ✅ Local storage in development and Cloudflare R2 S3-compatible signed PUT in production/configured environments.

---

## Audit Fixes Applied

- ✅ `POST /api/media/upload` now requires admin auth.
- ✅ Order creation now uses Drizzle transaction (`db.transaction`) for order, items, and history.
- ✅ Shipping seed defaults corrected to paise: `99900` and `6000`.
- ✅ Local `site_config` values corrected for shipping threshold and flat rate.
- ✅ Module-state config defaults seeded for Core, CMS, E-Commerce, Blog, and Offline QR.
- ✅ Redis `SCAN` invalidation now accounts for the physical `an:` key prefix.
- ✅ Product/blog metadata now includes canonical, OpenGraph, and Twitter metadata.
- ✅ Payment-proof uploads now use signed tokens.
- ✅ R2 uploads now use S3-compatible request signing.
- ✅ Secret config values are encrypted at rest when an app secret exists.
- ✅ Same-site mutation hardening added in `proxy.ts`.
- ✅ `npm run verify` passes after the fixes.

---

## Production Blockers

1. 🔴 Replace seed admin password flow with production-safe first-admin setup or forced password rotation.
2. 🔴 Configure real production credentials for email, WhatsApp, R2, Sentry, payment QR/UPI, and future providers.
3. 🟡 Keep deep module package isolation as a rule before adding heavy MLM/payout engines; current cart/provider loading is already module-aware.

---

## Next Phases

### Phase A — Module Control Plane

- ✅ Add module manifest registry in `src/lib/modules.ts`.
- ✅ Seed `module_core_enabled=true`, `module_cms_enabled=true`, `module_ecommerce_enabled=true`, `module_blog_enabled=true`.
- ✅ Add `getModuleState()`, `isModuleEnabled()`, payment module state, page gates, and API gates.
- ✅ Generate admin/sidebar and public nav items from enabled module manifests.
- ✅ Add Admin Settings module toggles; Core disabled control is locked.
- ✅ Gate public routes, admin routes, customer routes, checkout routes, and APIs by module state.
- ✅ Register Offline QR as an E-Commerce-dependent payment submodule.
- ✅ Add Core-owned locale/currency config defaults and settings fields.
- ✅ Add `npm run smoke`, `npm run e2e`, and `npm run verify`.
- ✅ Verified with `npm run verify` on 2026-05-30.

### Phase A.2 — Deep Module Isolation Hardening

- 🟡 Move future heavy module manifests/services toward `src/modules/<module>/` boundaries before MLM work starts.
- ✅ Replace current cart provider/header static imports with dynamic imports behind E-Commerce enabled checks.
- ✅ Define seed defaults for current modules and provider config in `scripts/config-seed.js`.
- ✅ Define future plugin direction for payment gateways and MLM engines in this roadmap.
- ✅ Document memory/load expectations per install profile: CMS-only, Blog-only, CMS+Blog, CMS+Blog+E-Commerce.

### Phase B — Admin Customers

- ✅ `GET /api/admin/customers` with search, pagination, order counts, spend totals.
- ✅ `GET /api/admin/customers/[id]` detail with profile, addresses, orders.
- ✅ `PATCH /api/admin/customers/[id]` deactivate/reactivate.
- ✅ `/admin/customers` list UI.
- ✅ `/admin/customers/[id]` detail UI.
- ✅ E-Commerce module gate covers admin customers route/API/nav.
- ✅ Verified with `npm run verify` on 2026-05-30.

### Phase C — Admin Media Library

- ✅ `GET /api/admin/media` with folder/type/search pagination.
- ✅ `GET/PATCH/DELETE /api/admin/media/[id]`.
- ✅ `/admin/media` grid/list view.
- ✅ Upload through existing `POST /api/media/upload`.
- ✅ Copy URL, preview, alt text edit, folder edit.
- ✅ Protect deletes when media is referenced by products, blog, CMS, or site config.
- ✅ Verified with `npm run verify` on 2026-05-30.

### Phase D — Analytics

- ✅ `/admin/analytics`.
- ✅ `GET /api/admin/analytics` with range filtering.
- ✅ Revenue by day.
- ✅ Orders by status/payment status.
- ✅ Product sales ranking.
- ✅ Customer growth.
- ✅ CSV export.
- ✅ E-Commerce module gate covers analytics route/API/nav.
- ✅ Verified with `npm run verify` on 2026-05-30.

### Phase E — WhatsApp Operations

- ✅ `/admin/whatsapp` send panel.
- ✅ Message template manager.
- ✅ Per-order resend buttons and API.
- ✅ Notification delivery logs in `whatsapp_logs`.
- ✅ Local/dev behavior logs messages as `skipped` when Meta credentials are absent.
- ✅ Verified with `npm run verify` on 2026-05-30.

### Phase F — Auth, Notification, OTP, SEO

- ✅ `src/app/sitemap.ts`.
- ✅ `src/app/robots.ts`.
- ✅ `POST /api/auth/forgot-password`.
- ✅ `POST /api/auth/reset-password`.
- ✅ `POST /api/auth/verify-email`.
- ✅ `POST /api/auth/resend-verification`.
- ✅ Registration email verification OTP via Resend provider facade.
- ✅ `src/lib/notifications.ts` gateway facade and delivery logs.
- ✅ `src/lib/otp.ts` hashed OTP lifecycle with expiry, attempts, and consumption.
- ✅ `GET/PATCH /api/notifications` in-app notification center API.
- ✅ `POST /api/notifications/push-subscriptions` storage provision for future Web Push.
- ✅ Admin Settings fields for Resend API key, notification channel toggles, and OTP controls.
- ✅ Redis login/register/forgot/resend rate limiting.
- ✅ Smoke/E2E coverage for auth recovery, verification, notifications, sitemap, robots.
- ✅ Verified with build, smoke, and E2E on 2026-05-30.

### Phase F.2 — Remaining SEO, Security, Production

- ✅ Per-product/per-blog canonical, OpenGraph, and Twitter metadata improvements.
- ✅ Sentry server-side envelope reporting with Admin Settings and env fallback.
- ✅ E2E test: register → order → upload proof → admin verify → shipped.
- ✅ Secret config values encrypted at rest before storing real production API keys.
- ✅ Same-site mutation hardening for API writes.
- ✅ Signed payment-proof upload token.
- ✅ Cloudflare R2 signed upload implementation.
- ✅ External key provisions in Admin Settings for Resend, SMS, Telegram, Web Push, WhatsApp, R2, Razorpay, Stripe, and Sentry.
- 🟡 Lighthouse/performance pass remains a launch QA activity, not a missing feature.
- 🟡 Actual SMS/Telegram/Web Push send adapters require provider selection; the module-aware config slots and env fallbacks are complete.

---

## Launch Switch Checklist

When the project is ready to go live:

- ✅ Move the CMS homepage from `/home` to `/`.
- ✅ Keep `/home` as a landing alias.
- ✅ Keep Coming Soon available at `/coming-soon`.
- ❌ Confirm all enabled modules have admin toggles and disabled modules do not expose routes/API.
- ❌ Verify payment QR, WhatsApp, email, R2, domain, SSL, and admin password.
