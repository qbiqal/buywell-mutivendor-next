# APRAS Naturals — Platform Mind Map

> Last updated: 2026-06-02
> Current state: CMS landing is active at `/`; `/home` is an alias; Coming Soon is available at `/coming-soon`.

---

## 1. Platform Map

```txt
APRAS Naturals
├── Core
│   ├── Auth: JWT cookie `an_token`
│   ├── Users: customer/admin/qbiqal
│   ├── Settings: DB-backed `site_config`
│   ├── Cache: Redis `an:` namespace
│   ├── Health: /api/health
│   ├── Module registry/state
│   ├── Locale/currency baseline
│   ├── Notification provider facade
│   ├── Notification wallets: WhatsApp/email/SMS credits + ledger
│   ├── External provider key config with env fallback
│   ├── Secret config encryption
│   ├── OTP: email verification + password reset
│   ├── Rate limiting: Redis fixed windows
│   ├── Same-site API mutation hardening
│   ├── Rich HTML sanitizer
│   ├── Observability: Sentry envelope capture
│   ├── Brand logos: admin logo + website logo via DB config, including the custom landing topbar
│   ├── Compliance: GDPR/DPDP checklist, evidence, module visibility, policy coverage
│   ├── Theme: Public Sans + persisted light/dark mode
│   └── /admin/media
│
├── CMS Module
│   ├── /
│   ├── /home
│   ├── /coming-soon
│   ├── /admin/cms
│   ├── /admin/cms/[sectionKey]
│   ├── /admin/cms/pages
│   ├── /admin/cms/menus
│   ├── /[slug] published CMS pages
│   ├── cms_sections
│   ├── cms_pages
│   ├── cms_menus
│   ├── cms_menu_items with parent_item_id nested submenu support
│   ├── Policy CMS pages: terms, privacy, data protection/consent, refund, returns, cancellation, shipping, cookie
│   ├── testimonials
│   └── Structured landing content builder, pages, nested menus, media, and scroll-scrub hero video
│
├── SEO Module
│   ├── /admin/seo
│   ├── seo_page_overrides
│   ├── seo_internal_links
│   ├── seo_search_submissions
│   ├── traffic_events
│   ├── GTM / GA / Meta Pixel settings
│   ├── Search engine verification settings
│   └── Dynamic sitemap + robots controls
│
├── E-Commerce Module
│   ├── /shop
│   ├── /shop/[slug] product gallery carousel + admin edit shortcut
│   ├── CartDrawer + CartContext
│   ├── Dynamic cart provider/header action when enabled
│   ├── /checkout
│   ├── /orders
│   ├── /profile
│   ├── /admin/orders
│   ├── /admin/products
│   ├── /admin/customers
│   ├── /admin/refunds
│   ├── /admin/reviews
│   ├── Nested product categories and colorful tags
│   ├── Customer refund requests
│   ├── Product reviews and likes
│   ├── Reusable admin datatable filters for commerce CRUD
│   └── products, variants, images, orders, order_items, refund_requests, product_reviews
│
├── Blog Module
│   ├── /blog
│   ├── /blog/[slug]
│   ├── /admin/blog
│   ├── /admin/blog/comments
│   ├── Nested categories and colorful tags
│   ├── Member-only nested comments and likes
│   ├── Reusable admin datatable filters for blog CRUD
│   └── blog_posts, blog_categories, blog_comments, blog_comment_likes
│
└── Payment Modules
    └── offline_qr
        ├── Admin QR/UPI config
        ├── Gateway registry session
        ├── Customer proof upload with signed token
        └── Admin manual verification

Core Admin Utilities
├── /admin/media
├── /admin/whatsapp
│   ├── WAHA/Meta provider config
│   ├── Manual send
│   ├── Template manager
│   ├── Per-order resend
│   ├── Wallet-gated sends
│   └── whatsapp_logs
├── /admin/notification-wallets
│   ├── Qbiqal-only credit control
│   ├── WhatsApp/email/SMS balances
│   └── notification_wallet_transactions
└── /admin/settings
    ├── Tabbed sections
    ├── Module toggles
    ├── Resend/SMS/Telegram/Web Push keys
    ├── WAHA/Meta WhatsApp/R2/Razorpay/Stripe/Sentry provider keys
    ├── Notification channel toggles
    ├── OTP TTL/attempt controls
    └── Admin/website logo uploaders with crop reset and clear buttons
```

---

## 2. Route Map

```txt
Public
  /                         CMS landing page
  /home                     CMS landing alias
  /coming-soon              Previous Coming Soon page
  /shop                     Product listing
  /shop/[slug]              Product detail + member reviews
  /blog                     Blog listing
  /blog/[slug]              Blog detail + nested member comments
  /[slug]                   Published CMS page
  /checkout                 Checkout / sample request
  /checkout/payment         QR proof upload
  /checkout/confirmation    Confirmation

Auth
  /login
  /register
  /forgot-password
  /forget-password            Redirect alias
  /reset-password
  /verify-email

Customer
  /orders
  /orders/[id]              Order detail + refund request form
  /profile
  /notifications

Admin
  /admin/dashboard
  /admin/orders
  /admin/orders/[id]
  /admin/products
  /admin/products/new
  /admin/products/[id]/edit
  /admin/reviews
  /admin/refunds
  /admin/customers
  /admin/customers/[id]
  /admin/media
  /admin/analytics
  /admin/whatsapp
  /admin/notification-wallets  Qbiqal-only wallet credit and ledger
  /admin/blog
  /admin/blog/new
  /admin/blog/[id]/edit
  /admin/blog/comments
  /admin/cms
  /admin/cms/[sectionKey]
  /admin/cms/pages
  /admin/cms/pages/new
  /admin/cms/pages/[id]/edit
  /admin/cms/menus
  /admin/seo
  /admin/compliance          GDPR/DPDP evidence, policies, module coverage
  /admin/analytics           Commerce + first-party traffic analytics
  /admin/settings              Tabbed modules, brand, providers, localization, commerce, notifications, OTP
```

---

## 3. Order Flow

```txt
Customer
  /shop -> ProductCard/ProductDetail -> CartContext -> CartDrawer
  -> /checkout
  -> POST /api/orders
     -> server recalculates prices
     -> atomically decrements variant stock
     -> creates gateway session
     -> returns signed proof upload token
  -> /checkout/payment?orderId=...
  -> POST /api/orders/[id]/upload-proof with token
  -> /checkout/confirmation

Admin
  /admin/orders
  -> /admin/orders/[id]
  -> verify payment / update status / add tracking
  -> WhatsApp customer notification when configured

Customer
  /orders
  -> /orders/[id]
  -> OrderTimeline
  -> optional refund request form for eligible paid orders

Admin
  /admin/refunds
  -> requested / under_review / approved / rejected / processed
  -> refund_events audit history
```

Important audit note:

- Order creation uses a Drizzle transaction for order, stock decrement, items, and initial history.
- Payment proof upload requires an order-scoped signed token.
- Product variant edits preserve historical order references by deactivating removed variants.

---

## 4. Auth Flow

```txt
POST /api/auth/login
  -> Redis rate limit by IP/email
  -> bcrypt compare
  -> sign JWT with jose
  -> set httpOnly cookie an_token

POST /api/auth/register
  -> Redis rate limit by IP
  -> create customer
  -> create hashed email_verification OTP
  -> send email through notification provider facade
  -> create in-app welcome notification
  -> sign JWT
  -> set httpOnly cookie an_token

POST /api/auth/forgot-password
  -> Redis rate limit by IP/email
  -> generic response to avoid account enumeration
  -> create hashed password_reset OTP for active account
  -> send email through notification provider facade

POST /api/auth/reset-password
  -> verify unexpired OTP and max attempts
  -> consume OTP
  -> bcrypt hash new password

POST /api/auth/verify-email
  -> verify unexpired OTP
  -> consume OTP
  -> set users.email_verified=true

proxy.ts
  -> /orders, /profile, /notifications require authenticated user
  -> /admin requires admin or qbiqal role
  -> logged-in users are redirected away from login/register

API guards
  -> createAuthGuard()
  -> createAdminGuard()
  -> createQbiqalGuard()
```

Current:

- Redis session revocation is documented as a target but not fully used.
- Redis rate limiting is implemented for login, register, forgot password, and resend verification.
- Missing email provider credentials skip/log locally instead of breaking auth flows.
- Provider keys are DB-first and fall back to `.env` only when DB config is empty.
- Secret provider values are encrypted at rest when an app secret is configured.

---

## 5. Data Model Map

```txt
users
  ├── addresses
  ├── orders
  │   ├── order_items
  │   │   └── product_variants -> products
  │   └── order_status_history
  ├── blog_posts
  ├── blog_comments
  ├── blog_comment_likes
  ├── product_reviews
  ├── product_review_likes
  ├── refund_requests
  ├── media
  ├── notifications
  ├── notification_deliveries
  ├── notification_wallet_transactions
  ├── otp_codes
  └── push_subscriptions

products
  ├── product_variants
  ├── product_categories
  ├── product_images
  └── product_reviews

blog_categories
  └── blog_posts
      └── blog_comments

content_tags
refund_requests
  └── refund_events
product_reviews
  └── product_review_likes
blog_comments
  └── blog_comment_likes
compliance_checks

site_config
cms_sections
cms_pages
cms_menus
  └── cms_menu_items
      └── parent_item_id nested submenu relation
seo_page_overrides
seo_internal_links
seo_search_submissions
traffic_events
testimonials
notification_deliveries
notification_wallets
  └── notification_wallet_transactions
otp_codes
push_subscriptions
whatsapp_logs
order_sequence
```

All money is integer paise.

---

## 6. Cache Map

Code passes unprefixed keys; Redis stores them with `an:` prefix.

```txt
config:*                  Site config cache
query:products:*          Product list queries
query:product:*           Product detail queries
query:related:*           Related product queries
query:blog:*              Blog queries
query:cms:*               CMS section queries
query:cms:pages:*         CMS page queries
query:cms:menus:*         Header/footer menu queries
query:seo:*               SEO override/settings-derived queries
query:traffic:*           First-party traffic analytics
query:testimonials:*      Testimonial queries
page:*                    Future page-level cache
```

Invalidation targets:

| Mutation | Cache |
|---|---|
| Product create/update/delete | products, product detail, shop/home |
| Blog publish/update/delete | blog |
| CMS section update | cms, home |
| CMS page create/update/delete | cms pages, sitemap, affected public slug |
| CMS menu update | menus, public shell |
| Config update | config, home |
| SEO update | seo, sitemap, robots, public shell |
| Traffic event | admin traffic analytics |
| Testimonial update | testimonials, home |

---

## 7. CMS Sections

Seeded sections:

| Key | Purpose |
|---|---|
| `hero` | Main hero |
| `marquee` | Scrolling trust strip |
| `promise` | Brand promise |
| `purity` | Purity claim section |
| `products` | Featured products |
| `ghee` | A2 Ghee section |
| `gallery` | Gallery |
| `leadership` | Recognition callout |
| `testimonials` | Featured testimonials |
| `how_it_works` | Purchase process |
| `mission` | Mission quote |
| `faq` | FAQ |
| `cta` | Bottom call-to-action |

Current:

- ✅ `/home` reads enabled sections.
- ✅ `/admin/cms` lists/toggles sections.
- ✅ `/admin/cms/[sectionKey]` edits enabled state, sort order, and structured section content, with JSON as advanced fallback.
- ✅ `/admin/cms/pages` creates and edits published CMS pages at `/{slug}`.
- ✅ CMS page editor includes on-page SEO, module visibility, policy type, canonical/robots fields, and OG crop upload.
- ✅ Policy pages are seeded for terms, privacy, data protection/consent, refund, return/replacement, cancellation, shipping, and cookie coverage.
- ✅ Production startup runs a safe CMS content seed so policy pages, compliance rows, and nested public menu links are created on deploy without the local bootstrap seed.
- ✅ `/admin/cms/menus` manages landing header, other-pages header, and footer menus with drag-and-drop ordering and parent submenu assignment.
- ✅ Available menu targets include CMS pages, blog listing/posts, shop listing/products, landing anchors, and external links.
- ✅ `/admin/seo` manages sitewide SEO, analytics tags, verification codes, route overrides, internal links, and search submission logs.
- ✅ `/admin/settings` owns core brand logos: admin panel logo 144x144 and website logo 360x96 via `MediaUploader`.
- ✅ `/admin/settings` is tabbed and logo upload previews have clear/reset controls.
- ✅ Landing custom topbar/drawer uses the configured website logo.
- ✅ Landing custom topbar, other-page header, mobile drawers, and footer render nested policy submenus from CMS menus.

---

## 8. Admin Panel Map

```txt
AdminSidebar
├── Dashboard      ✅
├── Orders         ✅
├── Products       ✅
├── Refunds        ✅
├── Reviews        ✅
├── Customers      ✅
├── Blog           ✅
├── Blog Comments  ✅
├── Media          ✅
├── CMS            ✅ list/toggle/detail editor
├── WhatsApp       ✅
├── Wallets        ✅ qbiqal only
├── Compliance     ✅
├── Analytics      ✅
└── Settings       ✅
```

Current module-aware sidebar:

- Core always shows Dashboard and Settings.
- Qbiqal role gets Notification Wallets in addition to normal admin nav.
- Mobile admin sidebar is closed by default and opens as a full drawer.
- CMS nav shows only if CMS module enabled.
- E-Commerce nav shows Orders, Products, Reviews, Refunds, Customers, and Analytics only if E-Commerce enabled.
- Blog nav shows Blog and Blog Comments only if Blog enabled.
- Compliance is a Core admin page and hides module-specific policy/checklist rows when a module is disabled.
- Payment gateway controls show under Settings.

---

## 9. Module Enable/Disable Control Plane

```txt
site_config
  module_core_enabled=true
  module_cms_enabled=true
  module_ecommerce_enabled=true
  module_blog_enabled=true
  payment_offline_qr_enabled=true
```

When disabled:

- ✅ Public nav item hidden.
- ✅ Admin nav item hidden.
- ✅ Page route returns disabled/404.
- ✅ API route returns 404 module disabled response.
- ✅ E-Commerce client provider is skipped.
- ✅ Cart provider and cart header action are dynamically imported only when E-Commerce is enabled.
- 🟡 Future heavy MLM/payment engines must use deeper per-module service boundaries before they are added.

Core cannot be disabled.

---

## 10. Notification and OTP Map

```txt
src/lib/notifications.ts
  getNotificationConfig()
  createInAppNotification()
  sendEmailNotification()
  logNotificationDelivery()

src/lib/notification-wallet.ts
  ensureNotificationWallets()
  creditNotificationWallet()
  debitNotificationWallet()
  reverseNotificationDebit()

src/lib/otp.ts
  createOtp()
  verifyOtpCode()
  sendEmailVerificationOtp()
  sendPasswordResetOtp()
```

Provider slots:

- ✅ Email: Resend implemented and wallet-gated.
- ✅ In-app: DB notifications implemented.
- ✅ Push: subscription storage implemented.
- ✅ WhatsApp: WAHA self-hosted gateway and Meta fallback path exist; sends are wallet-gated.
- ✅ Notification wallets: WhatsApp/email/SMS balances and Qbiqal credit ledger.
- ✅ Admin key slots/env fallbacks: SMS, Telegram, Web Push, WhatsApp, R2, Razorpay, Stripe, Sentry.
- 🟡 Web Push sending worker/provider pending final runtime/provider decision.
- 🟡 SMS and Telegram adapters pending selected vendor/API contract.

Admin configuration:

- `notification_resend_api_key` is entered in `/admin/settings`.
- WAHA credentials needed for self-hosted WhatsApp: base URL, session, optional `X-Api-Key`, chat suffix, and admin WhatsApp number.
- SMS, Telegram, Web Push, WhatsApp, R2, Razorpay, Stripe, and Sentry credentials can be entered in `/admin/settings`.
- Qbiqal credits WhatsApp/email/SMS wallets from `/admin/notification-wallets`.
- Empty DB values fall back to environment variables.
- `notification_email_enabled`, `notification_sms_enabled`, `notification_whatsapp_enabled`, `notification_telegram_enabled`, and `notification_push_enabled` gate each channel.
- WhatsApp/email/SMS sends require both enabled/configured channel settings and a positive channel wallet balance.
- `otp_email_verification_ttl_minutes`, `otp_password_reset_ttl_minutes`, and `otp_max_attempts` control OTP behavior.

---

## 11. Payment Gateway Map

```txt
src/lib/payment/types.ts
  PaymentGateway interface

src/lib/payment/offline-qr.ts
  Offline QR gateway

src/lib/payment/index.ts
  Registry and fallback
```

Current:

- ✅ Offline QR gateway exists.
- ✅ Payment settings allow QR/UPI/company edit.
- ✅ Offline QR gateway toggle exists and depends on E-Commerce.
- ✅ Order creation uses the gateway registry and stores the selected gateway.

Next:

- Add future gateways as isolated modules/plugins.
- Add webhook/audit behavior when an online gateway is selected.

---

## 12. Production Risk Map

| Risk | Status |
|---|---|
| Seed admin/qbiqal passwords | 🔴 Must harden |
| Login/register/recovery rate limiting | ✅ Built with Redis |
| CSRF hardening | ✅ Same-site mutation checks built |
| Signed payment-proof uploads | ✅ Built |
| Proper R2 upload signing | ✅ Built |
| Deep module package isolation | 🟡 Current cart loading fixed; future heavy modules must keep this rule |
| Inventory decrement/reservation | ✅ Stock decrement built |
| WhatsApp WAHA credentials | 🟡 Base URL/session defaulted; API key/admin number must be configured if required |
| Notification wallet balance | 🟡 Qbiqal must credit enabled paid channels before production sends |
| Sitemap/robots | ✅ Built |
| Secret config storage | ✅ Encrypted at rest with app secret |
| GDPR/DPDP checklist evidence | ✅ Admin tracking built; final legal review still required |
| Refund/review/comment moderation | ✅ Built with approval queues and abuse filter |
| Web Push send provider | 🟡 Provider/runtime decision pending |
| SMS/Telegram providers | 🟡 Provider selection pending |

---

## 13. Current Build Verification

Latest local verification on 2026-06-02:

- ✅ `npm run db:generate`
- ✅ `set -a; source .env.local; set +a; npm run db:migrate`
- ✅ `npm run db:seed`
- ✅ `npm run db:content-seed`
- ✅ `npm run db:indexes`
- ✅ `npm run typecheck`
- ✅ `npm run unit`
- ✅ `npm run build`
- ✅ `npm run smoke`
- ✅ `npm run e2e`
- ✅ Next.js 16.2.2 compiled and type-checked.
- ✅ Routes include `/`, `/home`, shop, blog, checkout, customer, admin, and APIs.
- ✅ Live E2E toggles Blog and E-Commerce off and verifies module-disabled API behavior.
- ✅ Live E2E verifies media upload/list/edit/delete and confirms Media remains available when E-Commerce is disabled.
- ✅ Live E2E verifies analytics page, JSON API, CSV export, and E-Commerce disabled behavior.
- ✅ Live E2E verifies WhatsApp page, manual log, order resend log, and order resend disabled when E-Commerce is disabled.
- ✅ Admin role model includes `qbiqal` for notification wallet crediting.
- ✅ Live E2E verifies forgot/reset password, email verification, notifications, sitemap, and robots.
- ✅ Live E2E verifies real order creation, signed proof upload, stock decrement, admin payment verification, and shipping.
- ✅ Build includes `/admin/blog/comments`, `/admin/reviews`, `/admin/refunds`, `/admin/compliance`, blog comments, product reviews, refund APIs, 8 policy CMS pages, and nested CMS menus.

---

## 14. Next Work Order

1. ✅ Phase A: Module control plane.
2. ✅ Phase B: Admin customers.
3. ✅ Phase C: Admin media.
4. ✅ Phase D: Analytics.
5. ✅ Phase E: WhatsApp operations.
6. ✅ Phase F: Auth recovery, notification/OTP, sitemap, robots, rate limiting.
7. ✅ Phase F.2: Security/production hardening for current launch surface.
8. ✅ Phase G: CMS/SEO/editor polish, comments, reviews, refunds, compliance, and export workflows.
9. 🟡 Phase A.2/H: Future heavy-module isolation rules and launch switch from `/home` to `/`.

After each completed phase, update:

- `docs/roadmap.md`
- `CLAUDE.md`
- `docs/mind-map.md`
