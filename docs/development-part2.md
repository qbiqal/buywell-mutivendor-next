# APRAS Naturals — Development Blueprint Part 2
## Database, Cache, API, Modules, and Feature Specifications

> Last updated: 2026-05-30
> Source of truth: `src/lib/db/schema.ts`, `src/lib/cache.ts`, `src/lib/config.ts`, `src/lib/payment/*`, and `src/app/api/*`.

---

## 1. Database Schema

All prices are stored in paise. All tables are defined in `src/lib/db/schema.ts`.

| Table | Purpose | Status |
|---|---|---|
| `users` | Customer/admin accounts | ✅ |
| `addresses` | Saved customer addresses | ✅ |
| `products` | Product master records | ✅ |
| `product_variants` | Size/price/stock variants | ✅ |
| `product_images` | Product image gallery | ✅ |
| `orders` | Order header, payment, shipping, flags | ✅ |
| `order_items` | Snapshot-based order line items | ✅ |
| `order_status_history` | Order timeline/status audit | ✅ |
| `blog_categories` | Blog taxonomy | ✅ |
| `blog_posts` | Blog content and SEO metadata | ✅ |
| `media` | Uploaded file metadata | ✅ |
| `site_config` | DB-backed key-value config | ✅ |
| `cms_sections` | Homepage section config | ✅ |
| `testimonials` | Landing testimonial content | ✅ |
| `notifications` | Customer in-app notifications | ✅ |
| `notification_deliveries` | Cross-channel delivery audit log | ✅ |
| `otp_codes` | Hashed OTP codes for email verification/password reset | ✅ |
| `push_subscriptions` | Browser push subscription storage | ✅ storage + provider config |
| `order_sequence` | Yearly order number sequence | ✅ |

---

## 2. Local Database State

Local setup has been completed.

| Item | Status |
|---|---|
| Local role `apras_user` | ✅ |
| Local DB `apras_naturals_db` | ✅ |
| Migrations applied | ✅ |
| Seed data loaded | ✅ |
| Config defaults loaded | ✅ |
| Indexes created | ✅ |

Seed counts:

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

Production should still use Coolify environment variables and Docker startup.

---

## 3. Config Store

Config is DB-first through `site_config`.

| Category | Important Keys |
|---|---|
| general | `site_name`, `site_tagline`, `site_email`, `site_phone`, `site_address`, `maintenance_mode` |
| payment | `payment_default_gateway`, `payment_offline_enabled`, `payment_offline_qr_enabled`, `payment_qr_url`, `payment_upi_id`, `payment_company_name`, Razorpay/Stripe key slots |
| shipping | `shipping_free_above`, `shipping_flat_rate`, `shipping_free_enabled` |
| whatsapp | `whatsapp_admin_number`, `whatsapp_enabled`, `whatsapp_order_notify`, `whatsapp_phone_number_id`, `whatsapp_access_token`, WhatsApp templates |
| blog | `blog_enabled`, `blog_title`, `blog_layout`, `blog_posts_per_page` |
| media | `media_max_size_mb`, `media_storage`, Cloudflare R2 account/access/bucket/public URL keys |
| orders | `orders_guest_checkout`, `orders_sample_enabled`, `orders_prefix` |
| localization | `locale_default`, `locales_enabled`, `currency_default`, `currencies_enabled`, `currency_rates_json` |
| notification | `notification_in_app_enabled`, `notification_email_enabled`, `notification_email_provider`, `notification_email_from`, `notification_resend_enabled`, `notification_resend_api_key`, SMS keys, Telegram keys, Web Push VAPID keys, channel toggles |
| otp | `otp_email_enabled`, `otp_email_verification_enabled`, `otp_password_reset_enabled`, `otp_email_verification_ttl_minutes`, `otp_password_reset_ttl_minutes`, `otp_max_attempts` |
| observability | `sentry_enabled`, `sentry_dsn`, `sentry_environment` |

Correct money config values are in paise:

```txt
shipping_free_above=99900
shipping_flat_rate=6000
```

External provider/API keys are DB-first and fall back to `.env` only when DB values are empty. Secret config keys are encrypted before storage when `CONFIG_ENCRYPTION_KEY`, `APP_CONFIG_ENCRYPTION_KEY`, or `JWT_SECRET` is available.

---

## 4. Module Config Specification

The current code enforces the first module control plane through `src/lib/modules.ts`, DB-backed `site_config`, module-aware navigation, page guards, API guards, and module-aware root providers. Cart provider/header actions are dynamically imported only when E-Commerce is enabled. Deep per-module package splitting remains a rule before heavy MLM/payment plugins.

### Core Module

Core cannot be disabled.

Includes:

- Auth and roles
- Layout shells
- Settings
- Health
- DB/Redis/cache/config
- Module registry
- Locale/currency settings
- Admin dashboard shell

Config:

```txt
module_core_enabled=true
```

### CMS Module

Includes:

- `/home`
- `/admin/cms`
- `/api/cms`
- `/api/admin/cms`
- CMS sections and testimonials

Config:

```txt
module_cms_enabled=true
```

### E-Commerce Module

Includes:

- `/shop`
- `/shop/[slug]`
- `/checkout`
- `/orders`
- `/profile` address dependencies
- `/admin/orders`
- `/admin/products`
- Product/order APIs
- Payment gateway registry

Config:

```txt
module_ecommerce_enabled=true
```

### Blog Module

Includes:

- `/blog`
- `/blog/[slug]`
- `/admin/blog`
- Blog APIs

Config:

```txt
module_blog_enabled=true
```

### Payment Gateway Modules

Payment gateways are submodules. Offline QR is gateway #1.

```txt
payment_offline_qr_enabled=true
payment_razorpay_enabled=false
payment_stripe_enabled=false
```

Target behavior:

- Disabled gateways do not appear in checkout/admin.
- Checkout calls `getPaymentGateway()` instead of hardcoding gateway name.
- Gateway metadata appears in the admin module/payment settings UI.

---

## 5. Cache Strategy

Redis uses `keyPrefix: "an:"`; code should pass keys without the prefix.

| Cache Area | Pattern | TTL |
|---|---|---:|
| Product list | `query:products:*` | 15m |
| Product detail | `query:product:*` | 15m |
| Related products | `query:related:*` | 15m |
| Blog | `query:blog:*` | 15m |
| CMS sections | `query:cms:*` | 30m |
| Testimonials | `query:testimonials:*` | 15m |
| Config | `config:*` | 30m |
| Future page cache | `page:*` | 1h |

Invalidation helpers:

- `cacheInvalidate.products()`
- `cacheInvalidate.orders()`
- `cacheInvalidate.blog()`
- `cacheInvalidate.cms()`
- `cacheInvalidate.config()`
- `cacheInvalidate.testimonials()`

Audit note: product admin routes currently call lower-level `invalidateByPrefix()`. Prefer the named helpers when continuing work.

---

## 6. API Inventory

### Public

| Endpoint | Auth | Status |
|---|---|---|
| `GET /api/health` | None | ✅ |
| `GET /api/products` | None | ✅ |
| `GET /api/products/[slug]` | None | ✅ |
| `POST /api/orders` | Optional customer / guest | ✅ |
| `POST /api/orders/[id]/upload-proof` | Signed order token | ✅ |
| `GET /api/blog` | None | ✅ |
| `GET /api/blog/[slug]` | None | ✅ |
| `GET /api/cms` | None | ✅ |

### Auth

| Endpoint | Auth | Status |
|---|---|---|
| `POST /api/auth/login` | None | ✅ |
| `POST /api/auth/register` | None | ✅ |
| `GET /api/auth/me` | Customer/admin | ✅ |
| `POST /api/auth/logout` | None | ✅ |

### Customer

| Endpoint | Auth | Status |
|---|---|---|
| `GET /api/customer/orders` | Customer | ✅ |
| `GET /api/customer/orders/[id]` | Customer | ✅ |
| `GET /api/customer/profile` | Customer | ✅ |
| `PATCH /api/customer/profile` | Customer | ✅ |
| `POST /api/customer/addresses` | Customer | ✅ |
| `DELETE /api/customer/addresses?id=` | Customer | ✅ |

### Admin

| Endpoint | Auth | Status |
|---|---|---|
| `GET /api/admin/analytics` | Admin | ✅ |
| `GET /api/admin/analytics/dashboard` | Admin | ✅ |
| `GET/PATCH/POST /api/admin/whatsapp` | Admin | ✅ |
| `POST /api/admin/orders/[id]/whatsapp` | Admin | ✅ |
| `GET /api/admin/orders` | Admin | ✅ |
| `GET/PATCH /api/admin/orders/[id]` | Admin | ✅ |
| `GET/POST /api/admin/products` | Admin | ✅ |
| `GET/PUT/DELETE /api/admin/products/[id]` | Admin | ✅ |
| `GET/POST /api/admin/blog` | Admin | ✅ |
| `GET/PATCH/DELETE /api/admin/blog/[id]` | Admin | ✅ |
| `GET/POST/PATCH/DELETE /api/admin/blog/categories` | Admin | ✅ |
| `GET /api/admin/cms` | Admin | ✅ |
| `GET/PUT /api/admin/cms/[sectionKey]` | Admin | ✅ |
| `GET/PATCH /api/admin/config` | Admin | ✅ |
| `POST /api/media/upload` | Admin | ✅ |
| `GET /api/admin/customers` | Admin | ✅ |
| `GET/PATCH /api/admin/customers/[id]` | Admin | ✅ |
| `GET /api/admin/media` | Admin | ✅ |
| `GET/PATCH/DELETE /api/admin/media/[id]` | Admin | ✅ |

---

## 7. Feature Specifications

### 7.1 E-Commerce Flow

Built:

- Product listing with category filter.
- Product detail with gallery, variant selector, quantity, related products.
- Cart context with localStorage.
- Cart drawer from CustomerHeader.
- Checkout address/review.
- Free sample request path.
- Order creation with snapshot line items.
- Server-side order price recalculation.
- Atomic variant stock decrement.
- Payment proof upload with signed order token.
- Admin verification/status updates.

Still needed:

- Order cancel/refund workflow.
- Coupon/discount module if required later.
- Shipping method module if carriers become dynamic.

### 7.2 Payment Flow

Built:

- Payment gateway interface.
- Offline QR gateway.
- Registry-backed order creation/payment session.
- QR/UPI/company admin config.
- Payment proof upload.
- Admin manual verification.

Still needed later:

- Gateway webhooks for future online providers.
- Gateway audit logs when online gateways are added.

### 7.3 CMS Flow

Built:

- 13 seeded CMS sections.
- `/home` fetches enabled sections.
- Admin list and enabled toggle.
- `/admin/cms/[sectionKey]` editor for enabled state, sort order, and JSON config.

Still needed:

- Section-specific schema validation.
- CMS media selection from admin media library.

### 7.4 Blog Flow

Built:

- Blog list/detail.
- Admin blog list/new/edit/delete.
- Publish/draft/archive.
- Cover image upload.
- Category admin.

Still needed:

- Related post rendering.
- RSS if useful.

### 7.5 Media Flow

Built:

- Upload API writes local files in dev and DB metadata.
- Admin auth required on upload.
- MediaUploader component.
- Cloudflare R2 signed PUT upload helper for configured/production storage.

---

## 8. Security Requirements

Must complete before production:

- ✅ Redis rate limiting for login, registration, forgot password, and resend verification.
- ✅ Signed payment-proof upload tokens.
- ✅ Same-site mutation hardening for authenticated API writes.
- ✅ Sanitize rich HTML inputs for blog content and product long descriptions before rendering.
- ✅ Encrypt secret config values before real provider keys are stored.
- 🔴 Replace seed admin password process with secure first-admin setup or forced rotation.
- 🔴 Add audit logs for admin order/payment/status changes.
- 🔴 Ensure media upload accepts only configured types and sizes.

---

## 9. Data Integrity Requirements

Already improved:

- ✅ Order header, items, and initial history are inserted in one Drizzle transaction.
- ✅ Order placement atomically decrements variant stock.
- ✅ Order numbers use DB-backed sequence table.
- ✅ Product and variant uniqueness uses DB constraints.
- ✅ Media deletion is guarded when referenced by products/blog/CMS/site config.
- ✅ Product variant edits preserve ordered variants by deactivating removed variants.
- ✅ Product delete archives active products when variants are referenced by historical orders.

---

## 10. Build Verification

Latest successful local verification:

```bash
npm run verify
```

Build output includes:

- `/`
- `/home`
- `/shop`
- `/shop/[slug]`
- `/blog`
- `/blog/[slug]`
- `/checkout`
- `/checkout/payment`
- `/orders`
- `/orders/[id]`
- `/profile`
- `/admin/dashboard`
- `/admin/orders`
- `/admin/products`
- `/admin/blog`
- `/admin/cms`
- `/admin/cms/[sectionKey]`
- `/admin/settings`
- all listed API route handlers
