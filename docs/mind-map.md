# APRAS Naturals — Platform Mind Map

> Last updated: 2026-05-30
> Current state: CMS landing is active at `/`; `/home` is an alias; Coming Soon is available at `/coming-soon`.

---

## 1. Platform Map

```txt
APRAS Naturals
├── Core
│   ├── Auth: JWT cookie `an_token`
│   ├── Users: customer/admin
│   ├── Settings: DB-backed `site_config`
│   ├── Cache: Redis `an:` namespace
│   ├── Health: /api/health
│   ├── Module registry/state
│   ├── Locale/currency baseline
│   ├── Notification provider facade
│   ├── External provider key config with env fallback
│   ├── Secret config encryption
│   ├── OTP: email verification + password reset
│   ├── Rate limiting: Redis fixed windows
│   ├── Same-site API mutation hardening
│   ├── Rich HTML sanitizer
│   ├── Observability: Sentry envelope capture
│   ├── SEO: sitemap + robots
│   ├── Theme: Public Sans + persisted light/dark mode
│   └── /admin/media
│
├── CMS Module
│   ├── /
│   ├── /home
│   ├── /coming-soon
│   ├── /admin/cms
│   ├── /admin/cms/[sectionKey]
│   ├── cms_sections
│   ├── testimonials
│   └── Landing content, media, and scroll-scrub hero video
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
│   ├── Reusable admin datatable filters for commerce CRUD
│   └── products, variants, images, orders, order_items
│
├── Blog Module
│   ├── /blog
│   ├── /blog/[slug]
│   ├── /admin/blog
│   ├── Reusable admin datatable filters for blog CRUD
│   └── blog_posts, blog_categories
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
│   ├── Manual send
│   ├── Template manager
│   ├── Per-order resend
│   └── whatsapp_logs
└── /admin/settings
    ├── Module toggles
    ├── Resend/SMS/Telegram/Web Push keys
    ├── WhatsApp/R2/Razorpay/Stripe/Sentry provider keys
    ├── Notification channel toggles
    └── OTP TTL/attempt controls
```

---

## 2. Route Map

```txt
Public
  /                         CMS landing page
  /home                     CMS landing alias
  /coming-soon              Previous Coming Soon page
  /shop                     Product listing
  /shop/[slug]              Product detail
  /blog                     Blog listing
  /blog/[slug]              Blog detail
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
  /orders/[id]
  /profile
  /notifications

Admin
  /admin/dashboard
  /admin/orders
  /admin/orders/[id]
  /admin/products
  /admin/products/new
  /admin/products/[id]/edit
  /admin/customers
  /admin/customers/[id]
  /admin/media
  /admin/analytics
  /admin/whatsapp
  /admin/blog
  /admin/blog/new
  /admin/blog/[id]/edit
  /admin/cms
  /admin/cms/[sectionKey]
  /admin/settings              Modules, localization, currency, site, payment, shipping, notifications, OTP
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
  -> /admin requires admin role
  -> logged-in users are redirected away from login/register

API guards
  -> createAuthGuard()
  -> createAdminGuard()
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
  ├── media
  ├── notifications
  ├── notification_deliveries
  ├── otp_codes
  └── push_subscriptions

products
  ├── product_variants
  └── product_images

blog_categories
  └── blog_posts

site_config
cms_sections
testimonials
notification_deliveries
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
query:testimonials:*      Testimonial queries
page:*                    Future page-level cache
```

Invalidation targets:

| Mutation | Cache |
|---|---|
| Product create/update/delete | products, product detail, shop/home |
| Blog publish/update/delete | blog |
| CMS section update | cms, home |
| Config update | config, home |
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
- ✅ `/admin/cms/[sectionKey]` edits enabled state, sort order, and section JSON config.

---

## 8. Admin Panel Map

```txt
AdminSidebar
├── Dashboard      ✅
├── Orders         ✅
├── Products       ✅
├── Customers      ✅
├── Blog           ✅
├── Media          ✅
├── CMS            ✅ list/toggle/detail editor
├── WhatsApp       ✅
├── Analytics      ✅
└── Settings       ✅
```

Current module-aware sidebar:

- Core always shows Dashboard and Settings.
- CMS nav shows only if CMS module enabled.
- E-Commerce nav shows Orders, Products, and Customers only if E-Commerce enabled.
- Blog nav shows only if Blog enabled.
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

src/lib/otp.ts
  createOtp()
  verifyOtpCode()
  sendEmailVerificationOtp()
  sendPasswordResetOtp()
```

Provider slots:

- ✅ Email: Resend implemented.
- ✅ In-app: DB notifications implemented.
- ✅ Push: subscription storage implemented.
- ✅ WhatsApp: Meta/manual-send path exists.
- ✅ Admin key slots/env fallbacks: SMS, Telegram, Web Push, WhatsApp, R2, Razorpay, Stripe, Sentry.
- 🟡 Web Push sending worker/provider pending final runtime/provider decision.
- 🟡 SMS and Telegram adapters pending selected vendor/API contract.

Admin configuration:

- `notification_resend_api_key` is entered in `/admin/settings`.
- SMS, Telegram, Web Push, WhatsApp, R2, Razorpay, Stripe, and Sentry credentials can be entered in `/admin/settings`.
- Empty DB values fall back to environment variables.
- `notification_email_enabled`, `notification_sms_enabled`, `notification_whatsapp_enabled`, `notification_telegram_enabled`, and `notification_push_enabled` gate each channel.
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
| Seed admin password | 🔴 Must harden |
| Login/register/recovery rate limiting | ✅ Built with Redis |
| CSRF hardening | ✅ Same-site mutation checks built |
| Signed payment-proof uploads | ✅ Built |
| Proper R2 upload signing | ✅ Built |
| Deep module package isolation | 🟡 Current cart loading fixed; future heavy modules must keep this rule |
| Inventory decrement/reservation | ✅ Stock decrement built |
| WhatsApp Meta credentials | ❌ Production setup pending |
| Sitemap/robots | ✅ Built |
| Secret config storage | ✅ Encrypted at rest with app secret |
| Web Push send provider | 🟡 Provider/runtime decision pending |
| SMS/Telegram providers | 🟡 Provider selection pending |

---

## 13. Current Build Verification

Latest local verification:

- ✅ `npm run verify`
- ✅ `npm run build`
- ✅ `npm run smoke`
- ✅ `npm run e2e`
- ✅ Next.js 16.2.2 compiled and type-checked.
- ✅ Routes include `/`, `/home`, shop, blog, checkout, customer, admin, and APIs.
- ✅ Live E2E toggles Blog and E-Commerce off and verifies module-disabled API behavior.
- ✅ Live E2E verifies media upload/list/edit/delete and confirms Media remains available when E-Commerce is disabled.
- ✅ Live E2E verifies analytics page, JSON API, CSV export, and E-Commerce disabled behavior.
- ✅ Live E2E verifies WhatsApp page, manual log, order resend log, and order resend disabled when E-Commerce is disabled.
- ✅ Live E2E verifies forgot/reset password, email verification, notifications, sitemap, and robots.
- ✅ Live E2E verifies real order creation, signed proof upload, stock decrement, admin payment verification, and shipping.

---

## 14. Next Work Order

1. ✅ Phase A: Module control plane.
2. ✅ Phase B: Admin customers.
3. ✅ Phase C: Admin media.
4. ✅ Phase D: Analytics.
5. ✅ Phase E: WhatsApp operations.
6. ✅ Phase F: Auth recovery, notification/OTP, sitemap, robots, rate limiting.
7. ✅ Phase F.2: Security/production hardening for current launch surface.
8. 🟡 Phase A.2/G: Future heavy-module isolation rules and launch switch from `/home` to `/`.

After each completed phase, update:

- `docs/roadmap.md`
- `CLAUDE.md`
- `docs/mind-map.md`
