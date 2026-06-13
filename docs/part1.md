# BuyWell Multivendor Marketplace — Part 1 Blueprint
## Full Multivendor Conversion + New Design + Payment Expansion

> Created: 2026-06-13  
> Scope: Convert single-vendor APRAS Naturals into BuyWell Multivendor Marketplace  
> Framework: Next.js 16.2.2 · PostgreSQL 17 · Redis 7 · Coolify on Hetzner  
> Hosting: buywell.in / www.buywell.in → Qbiqal-app-server (10.0.0.4 / 178.104.105.31)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Design System Overhaul](#2-design-system-overhaul)
3. [Database Schema — Multivendor Extensions](#3-database-schema--multivendor-extensions)
4. [User Roles Architecture](#4-user-roles-architecture)
5. [Vendor Panel — Complete Specification](#5-vendor-panel--complete-specification)
6. [CMS Homepage Customizer — Banner Management](#6-cms-homepage-customizer--banner-management)
7. [Payment Gateway Expansion](#7-payment-gateway-expansion)
8. [Commission & Payout Management](#8-commission--payout-management)
9. [Refund Management — Multivendor Extension](#9-refund-management--multivendor-extension)
10. [Order Flow — Multivendor Split](#10-order-flow--multivendor-split)
11. [Admin Panel Extensions](#11-admin-panel-extensions)
12. [Compliance Pages](#12-compliance-pages)
13. [Phase-by-Phase Development Roadmap](#13-phase-by-phase-development-roadmap)
14. [Coolify Deployment](#14-coolify-deployment)
15. [CI/CD Pipeline](#15-cicd-pipeline)

---

## 1. Executive Summary

### What Changes

| Area | Before | After |
|---|---|---|
| Vendor model | Single vendor (admin owns all products) | Multi-vendor (each vendor owns their products) |
| Roles | customer / admin / qbiqal | customer / vendor / admin / qbiqal |
| Homepage | Scroll-scrub video hero | Sliding banner carousel (CMS-managed) |
| Design | APRAS Naturals brand palette | BuyWell marketplace palette (see §2) |
| Payments | Offline QR only | Offline QR + Razorpay + BuyWell Wallet (Part 2) |
| CMS landing | Section editor for old landing | Banner/slider manager for new homepage |
| Order flow | Single-vendor order | Split per vendor, commission deducted |
| Admin panel | Single-vendor management | Multivendor ops: vendor mgmt, commissions, payouts |
| Vendor panel | Absent | Full dedicated panel at /vendor/* |

### What Stays

- Auth flow (JWT cookie, OTP, recovery)
- Module registry (CMS, Blog, SEO, E-Commerce flags)
- Notification system (wallets, WhatsApp, email)
- Redis cache with `an:` prefix → rename to `bw:` in Phase 0
- Blog, SEO, compliance modules
- DB-first config with admin settings as single source of truth
- Secret encryption at rest

---

## 2. Design System Overhaul

### 2.1 New Color Palette

Design style: Clean marketplace, white-dominant, forest-green primary, light-green accent.

```css
/* Implemented in src/app/globals.css */

:root {
  /* Primary brand — BuyWell forest green */
  --green:          #0d7659;   /* primary */
  --green-lt:       #107d5d;   /* secondary / accent */
  --green-dk:       #0a5e47;   /* hover / pressed */
  --green-pale:     #e6f5f0;   /* subtle tint backgrounds */

  /* Admin / vendor sidebar */
  --sidebar-bg:     #062e24;   /* dark forest green */
  --sidebar-active: #4ade80;   /* bright green active indicator */

  /* Status colors (multi-color — keep as-is for legibility) */
  --status-pending:    #d97706;   /* amber */
  --status-confirmed:  #0d7659;   /* green */
  --status-shipped:    #2563eb;   /* blue */
  --status-delivered:  #059669;   /* emerald */
  --status-cancelled:  #ef4444;   /* red */
  --status-processing: #7c3aed;   /* purple */
}
```

### 2.2 Typography

Keep Public Sans. Add weight variations:
- Display headings: 700 (bold)
- Body: 400 (regular)
- Labels/caps: 600 (semibold)
- Font size scale: 12/14/16/18/20/24/28/32/40/48px

### 2.3 Homepage Layout (matching reference site)

```
┌─────────────────────────────────────────────────────┐
│  TOPBAR: Logo | Search bar | Cart | Account          │
│  NAV: Categories dropdown | Pages | Deals | About    │
├─────────────────────────────────────────────────────┤
│  HERO BANNER SLIDER (auto-play + manual dots/arrows) │
│  [Banner 1] [Banner 2] [Banner 3] ...                │
├─────────────────────────────────────────────────────┤
│  CATEGORY STRIP: icon chips scrollable horizontal    │
├─────────────────────────────────────────────────────┤
│  FEATURED PRODUCTS grid (CMS-managed)                │
├─────────────────────────────────────────────────────┤
│  BANNER AD ROW (2-column promotional banners)        │
├─────────────────────────────────────────────────────┤
│  LATEST PRODUCTS carousel                            │
├─────────────────────────────────────────────────────┤
│  VENDOR SPOTLIGHT (top vendors)                      │
├─────────────────────────────────────────────────────┤
│  TESTIMONIALS                                        │
├─────────────────────────────────────────────────────┤
│  FOOTER: Logo | Links | Social | Copyright           │
└─────────────────────────────────────────────────────┘
```

### 2.4 Component Style Rules

- Cards: 8px border-radius, 1px border `--color-border`, white bg, subtle box-shadow
- Buttons: Primary = orange bg + white text, height 40px, 8px radius, semibold
- Inputs: 1px border gray-300, 8px radius, focus ring orange-200
- Badges: Category/status chips with colored backgrounds
- No shadows heavier than `0 1px 3px rgba(0,0,0,0.08)`

---

## 3. Database Schema — Multivendor Extensions

All new migrations go into `src/lib/db/migrations/` via `npm run db:generate`.

### 3.1 New Tables

#### `vendors`
```sql
CREATE TABLE vendors (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_name    VARCHAR(200) NOT NULL,
  store_slug    VARCHAR(200) NOT NULL UNIQUE,
  description   TEXT,
  logo_url      TEXT,
  banner_url    TEXT,
  phone         VARCHAR(20),
  email         VARCHAR(200),
  address       TEXT,
  city          VARCHAR(100),
  state         VARCHAR(100),
  pincode       VARCHAR(10),
  gstin         VARCHAR(20),
  pan           VARCHAR(12),
  bank_account  VARCHAR(20),
  bank_ifsc     VARCHAR(15),
  bank_name     VARCHAR(100),
  account_holder VARCHAR(150),
  status        VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- pending | approved | suspended | rejected
  commission_override INTEGER,  -- paise, NULL = use global setting
  total_sales   INTEGER NOT NULL DEFAULT 0,  -- paise, denormalized
  total_orders  INTEGER NOT NULL DEFAULT 0,
  rating        NUMERIC(3,2) NOT NULL DEFAULT 0,
  is_featured   BOOLEAN NOT NULL DEFAULT false,
  meta_title    TEXT,
  meta_description TEXT,
  approved_at   TIMESTAMPTZ,
  approved_by   INTEGER REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### `vendor_commissions`
```sql
CREATE TABLE vendor_commissions (
  id            SERIAL PRIMARY KEY,
  order_item_id INTEGER NOT NULL REFERENCES order_items(id),
  vendor_id     INTEGER NOT NULL REFERENCES vendors(id),
  order_id      INTEGER NOT NULL REFERENCES orders(id),
  gross_amount  INTEGER NOT NULL,  -- paise (what customer paid)
  commission_rate INTEGER NOT NULL, -- basis points e.g. 1000 = 10%
  commission_amount INTEGER NOT NULL, -- paise (platform fee)
  vendor_payout INTEGER NOT NULL,   -- paise (gross - commission)
  status        VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- pending | cleared | on_hold | disputed
  payout_id     INTEGER REFERENCES vendor_payouts(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### `vendor_payouts`
```sql
CREATE TABLE vendor_payouts (
  id            SERIAL PRIMARY KEY,
  vendor_id     INTEGER NOT NULL REFERENCES vendors(id),
  amount        INTEGER NOT NULL,   -- paise
  status        VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- pending | processing | paid | failed | cancelled
  payment_method VARCHAR(50),       -- bank_transfer | upi | etc
  payment_reference VARCHAR(200),
  notes         TEXT,
  initiated_by  INTEGER REFERENCES users(id),
  initiated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### `vendor_payout_items`
```sql
CREATE TABLE vendor_payout_items (
  id            SERIAL PRIMARY KEY,
  payout_id     INTEGER NOT NULL REFERENCES vendor_payouts(id),
  commission_id INTEGER NOT NULL REFERENCES vendor_commissions(id),
  amount        INTEGER NOT NULL
);
```

#### `homepage_banners`
```sql
CREATE TABLE homepage_banners (
  id            SERIAL PRIMARY KEY,
  title         VARCHAR(300),
  subtitle      TEXT,
  image_url     TEXT NOT NULL,
  mobile_image_url TEXT,
  link_url      TEXT,
  link_text     VARCHAR(100),
  banner_type   VARCHAR(30) NOT NULL DEFAULT 'hero',
    -- hero | promo | category
  sort_order    INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  starts_at     TIMESTAMPTZ,
  ends_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 3.2 Modified Tables

#### `users` — add vendor_id FK
```sql
ALTER TABLE users ADD COLUMN vendor_id INTEGER REFERENCES vendors(id);
ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(20);
-- role: customer | vendor | admin | qbiqal
```

#### `products` — add vendor_id
```sql
ALTER TABLE products ADD COLUMN vendor_id INTEGER REFERENCES vendors(id);
-- NULL = platform-owned product (legacy / admin-managed)
```

#### `orders` — add vendor split tracking
Orders stay as-is (one order per checkout). Sub-orders per vendor are tracked via `order_vendor_splits`.

#### `order_vendor_splits`
```sql
CREATE TABLE order_vendor_splits (
  id            SERIAL PRIMARY KEY,
  order_id      INTEGER NOT NULL REFERENCES orders(id),
  vendor_id     INTEGER NOT NULL REFERENCES vendors(id),
  subtotal      INTEGER NOT NULL,   -- paise
  shipping      INTEGER NOT NULL DEFAULT 0,
  total         INTEGER NOT NULL,
  status        VARCHAR(30) NOT NULL DEFAULT 'pending',
  vendor_note   TEXT,
  shipped_at    TIMESTAMPTZ,
  tracking_number VARCHAR(100),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 3.3 site_config New Keys

```
-- Multivendor
multivendor_enabled          = true
vendor_auto_approve          = false
vendor_commission_default    = 1000   (basis points = 10%)
vendor_min_payout_amount     = 50000  (paise = ₹500)
vendor_payout_schedule       = weekly (weekly | biweekly | monthly | manual)

-- Payment gateways
payment_razorpay_enabled     = true
payment_razorpay_key_id      = (encrypted)
payment_razorpay_key_secret  = (encrypted)
payment_razorpay_webhook_secret = (encrypted)
payment_bwallet_enabled      = false  (enabled in Part 2)
payment_bwallet_api_url      = https://api.buywellglobal.com
payment_bwallet_api_key      = (encrypted, Part 2)

-- Homepage
homepage_hero_autoplay_ms    = 4000
homepage_hero_show_dots      = true
homepage_hero_show_arrows    = true
```

---

## 4. User Roles Architecture

### 4.1 Role Hierarchy

```
qbiqal (super-admin)
  └── admin
        └── vendor
              └── customer
```

### 4.2 Role Capabilities Matrix

| Capability | customer | vendor | admin | qbiqal |
|---|:---:|:---:|:---:|:---:|
| Browse shop | ✓ | ✓ | ✓ | ✓ |
| Place orders | ✓ | ✓ | ✓ | ✓ |
| Manage own products | — | ✓ | ✓ | ✓ |
| Manage all products | — | — | ✓ | ✓ |
| View vendor dashboard | — | ✓ | — | — |
| View admin dashboard | — | — | ✓ | ✓ |
| Approve vendors | — | — | ✓ | ✓ |
| Manage commissions | — | — | ✓ | ✓ |
| Process payouts | — | — | ✓ | ✓ |
| Credit wallets | — | — | — | ✓ |
| Change site config | — | — | ✓ | ✓ |

### 4.3 Auth Guards

- `createCustomerGuard()` — existing
- `createVendorGuard()` — new: checks `role === 'vendor'` AND `vendor.status === 'approved'`
- `createAdminGuard()` — existing
- `createQbiqalGuard()` — existing

Vendor panel route protection (`/vendor/*`) uses `createVendorGuard()`.

### 4.4 Vendor Registration Flow

```
1. Customer clicks "Sell on BuyWell"
2. Fills vendor application form (store name, phone, GSTIN, bank details)
3. POST /api/vendor/apply → creates vendors row (status=pending) + sets user.role='vendor'
4. Admin receives in-app notification
5. Admin reviews at /admin/vendors → approves/rejects
6. PATCH /api/admin/vendors/[id] status=approved
   → sets vendor.status='approved'
   → sends email notification to vendor
   → vendor can now access /vendor/* panel
```

---

## 5. Vendor Panel — Complete Specification

### 5.1 Look & Feel

The vendor panel must be visually distinct from the admin panel.

```
Color scheme: White background, left sidebar in deep teal (#0F766E)
              with white text and orange active state.
Layout: Vertical left sidebar (fixed, 240px) + main content area
Mobile: Hamburger icon top-left → animated drawer slides in from left
        (CSS transform translateX transition 300ms ease)
        Backdrop overlay fades in (opacity 0 → 0.5)
```

### 5.2 Vendor Panel Routes

```
/vendor/dashboard          Overview stats
/vendor/products           My products list
/vendor/products/new       Add product
/vendor/products/[id]/edit Edit product
/vendor/orders             Orders for my products
/vendor/orders/[id]        Order detail (vendor's items only)
/vendor/payouts            Payout history & pending balance
/vendor/reviews            Reviews on my products
/vendor/analytics          My sales analytics
/vendor/profile            Store profile / bank details
/vendor/settings           Notification preferences
```

### 5.3 Vendor Dashboard Widgets

```
┌──────────────────────────────────────────────────────┐
│  VENDOR DASHBOARD                                     │
├──────────┬──────────┬──────────┬────────────────────┤
│ Revenue  │ Orders   │ Products │ Pending Payout     │
│ (30 days)│ (30 days)│ Active   │ (cleared balance)  │
├──────────┴──────────┴──────────┴────────────────────┤
│  Revenue chart (last 30 days, bar chart)              │
├──────────────────────────────────────────────────────┤
│  Recent orders (last 10, with status)                 │
├──────────────────────────────────────────────────────┤
│  Top products by revenue (last 30 days)               │
└──────────────────────────────────────────────────────┘
```

### 5.4 Vendor Product Management

Vendors can only manage their own products. The product form is identical to the admin form EXCEPT:
- Vendor cannot set `is_featured` (admin-only toggle)
- Vendor cannot set commission override
- Products go to `status=draft` first, admin approves OR `vendor_auto_approve=true` in config
- All products are pre-filtered to `vendor_id = current_vendor.id`

### 5.5 Vendor Order Management

Vendors see only their split of each order:
- Items they supplied
- Their share of the order total
- Ability to add tracking number / mark as shipped
- Cannot see payment details of the full order
- Cannot see other vendor's items in the same order

### 5.6 Vendor Payout Screen

```
┌─────────────────────────────────────────────────────┐
│  Pending Balance: ₹2,340.00                          │
│  [Request Payout] (if >= min threshold)              │
├─────────────────────────────────────────────────────┤
│  Payout History                                      │
│  Date | Amount | Status | Reference                  │
│  ...                                                 │
├─────────────────────────────────────────────────────┤
│  Commission Statement                                │
│  Order | Items | Gross | Commission | Net            │
│  ...                                                 │
└─────────────────────────────────────────────────────┘
```

### 5.7 Vendor Mobile Sidebar

```tsx
// Hamburger + animated drawer (no external library)
// Sidebar drawer uses CSS:
.vendor-sidebar {
  position: fixed;
  left: 0; top: 0; bottom: 0;
  width: 240px;
  background: #0F766E;
  transform: translateX(-100%);
  transition: transform 300ms ease;
  z-index: 50;
}
.vendor-sidebar.open {
  transform: translateX(0);
}
.vendor-sidebar-backdrop {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.5);
  opacity: 0;
  pointer-events: none;
  transition: opacity 300ms ease;
}
.vendor-sidebar-backdrop.visible {
  opacity: 1;
  pointer-events: all;
}
```

On desktop (≥1024px) sidebar is always visible and not collapsible.

---

## 6. CMS Homepage Customizer — Banner Management

### 6.1 Replacing Old CMS Landing

The old CMS `/admin/cms` section editor is **replaced** for the homepage context with a new **Homepage Builder** at `/admin/homepage`.

The existing CMS section editor is **retained** for other CMS pages (`/admin/cms/pages`, menus, etc.) and non-homepage sections.

### 6.2 Admin Homepage Builder UI

Route: `/admin/homepage`

```
┌──────────────────────────────────────────────────────┐
│  Homepage Builder                          [Preview]  │
├─────────────────┬────────────────────────────────────┤
│  SECTIONS       │  HERO BANNERS                      │
│  ✓ Hero Banners │  ┌──────────────────────────────┐  │
│  ✓ Categories   │  │ Banner 1 [img] Title Subtitle│  │
│  ✓ Featured     │  │ [Edit] [Delete] ↑ ↓          │  │
│    Products     │  ├──────────────────────────────┤  │
│  ✓ Promo Banners│  │ Banner 2 ...                 │  │
│  ✓ Latest Prods │  └──────────────────────────────┘  │
│  ✓ Vendors      │  [+ Add Banner]                     │
│  ✓ Testimonials │                                    │
└─────────────────┴────────────────────────────────────┘
```

### 6.3 Banner CRUD API

```
GET  /api/admin/homepage/banners          List all banners
POST /api/admin/homepage/banners          Create banner
GET  /api/admin/homepage/banners/[id]     Get single
PATCH /api/admin/homepage/banners/[id]    Update
DELETE /api/admin/homepage/banners/[id]   Delete
PATCH /api/admin/homepage/banners/reorder Drag-drop reorder (array of {id, sort_order})
```

Banner fields:
- `title` (text overlay on banner)
- `subtitle` (secondary text)
- `image_url` (desktop image, uploaded via media library)
- `mobile_image_url` (optional mobile crop)
- `link_url` (where clicking the banner navigates)
- `link_text` (CTA button text)
- `banner_type`: `hero` | `promo`
- `is_active`
- `starts_at` / `ends_at` (schedule banners)
- `sort_order`

### 6.4 Public Homepage Hero Slider

```tsx
// src/app/(public)/HomeHeroSlider.tsx  (client component)
// - Auto-advances every `homepage_hero_autoplay_ms` ms
// - Pause on hover
// - Touch/swipe support (pointer events, no library)
// - Dot navigation
// - Prev/Next arrows
// - Lazy loads off-screen images
// - Respects prefers-reduced-motion

// Data fetched server-side in page.tsx:
// GET /api/cms/banners?type=hero&active=true
// Cached: query:homepage:banners → invalidated on banner save
```

### 6.5 Cache Invalidation for Banners

Add to `cacheInvalidate` in `src/lib/cache.ts`:
```ts
banners: () => redis.del('query:homepage:banners')
```

Call `cacheInvalidate.banners()` on every banner create/update/delete/reorder.

---

## 7. Payment Gateway Expansion

### 7.1 Gateway Registry (extended)

```ts
// src/lib/payment/index.ts
export type GatewayKey = 'offline_qr' | 'razorpay' | 'bwallet';

export interface PaymentGateway {
  key: GatewayKey;
  name: string;
  isEnabled(): Promise<boolean>;
  createSession(order: Order, amount: number): Promise<GatewaySession>;
  verifyPayment(payload: unknown): Promise<PaymentVerification>;
  refund?(orderId: number, amount: number): Promise<RefundResult>;
}
```

### 7.2 Razorpay Gateway

File: `src/lib/payment/razorpay.ts`

Config keys (DB-first, env fallback):
- `payment_razorpay_key_id` / `RAZORPAY_KEY_ID`
- `payment_razorpay_key_secret` / `RAZORPAY_KEY_SECRET`
- `payment_razorpay_webhook_secret` / `RAZORPAY_WEBHOOK_SECRET`

Flow:
```
POST /api/orders
  → server creates Razorpay order via Razorpay Node SDK
  → returns { razorpay_order_id, amount, currency, key_id }
  → client opens Razorpay checkout modal
  → on success: razorpay_payment_id, razorpay_order_id, razorpay_signature
  → client calls POST /api/orders/[id]/verify-razorpay
  → server verifies HMAC signature
  → marks order as paid

POST /api/webhooks/razorpay
  → validates X-Razorpay-Signature header
  → handles: payment.captured, payment.failed, refund.created
  → idempotent (check if already processed by razorpay_payment_id)
```

Admin config panel at `/admin/settings` (Payments tab):
- Razorpay Key ID (text)
- Razorpay Key Secret (password, encrypted at rest)
- Webhook Secret (password, encrypted)
- Test mode toggle (`payment_razorpay_test_mode = true/false`)
- Enable/disable toggle

### 7.3 BuyWell Wallet Gateway (Stub for Part 1, full in Part 2)

File: `src/lib/payment/bwallet.ts`

In Part 1: Gateway exists but is disabled by default. Admin can enable the toggle but it shows "Coming Soon — Integration Pending" in checkout. This allows the admin panel config to be built now.

Config keys (all encrypted):
- `payment_bwallet_enabled` = false
- `payment_bwallet_api_url`
- `payment_bwallet_api_key`
- `payment_bwallet_webhook_secret`

Admin settings panel tab "BuyWell Wallet" shows:
- Enable toggle (disabled until Part 2 integration is done — or can be enabled by admin once Part 2 is deployed)
- API URL
- API Key
- Min order amount for wallet
- Max wallet usage per order (percentage or fixed, for partial payment)

### 7.4 Checkout Payment Selection UI

When multiple gateways are active, checkout step 2 shows payment method selector:

```
┌──────────────────────────────────────────────────────┐
│  SELECT PAYMENT METHOD                                │
├──────────────────────────────────────────────────────┤
│  ● Pay Online (Razorpay)              UPI/Card/NetB  │
│  ○ Cash on Delivery / Offline QR     Scan & Pay      │
│  ○ BuyWell Wallet                    Balance: ₹1,000 │
│    [Use ₹1,000 from wallet] +                        │
│    [Pay remaining ₹500 via Razorpay]                 │
└──────────────────────────────────────────────────────┘
```

Only gateways with `isEnabled() === true` are shown.

### 7.5 Partial Payment Logic (BuyWell Wallet)

When wallet balance < order total:
1. User selects wallet + a second gateway (Razorpay or Offline QR)
2. Client sends `{ primary: 'bwallet', secondary: 'razorpay', wallet_amount: 1000 }`
3. Server validates:
   - wallet balance ≥ wallet_amount
   - wallet_amount + secondary_amount = order total
4. Server creates Razorpay order for `secondary_amount` only
5. On Razorpay success → server calls BuyWell Global API to debit wallet_amount
6. Both must succeed or the whole payment is reversed
7. Order record stores both gateway references

### 7.6 Admin Payment Config Panel

Route: `/admin/settings` → "Payments" tab

```
Offline QR
  [x] Enabled
  QR Image: [upload]
  UPI ID: [text]
  Account Name: [text]

Razorpay
  [x] Enabled
  [ ] Test Mode
  Key ID: [text]
  Key Secret: [password ●●●●]
  Webhook Secret: [password ●●●●]

BuyWell Wallet
  [ ] Enabled (requires Part 2 integration)
  API URL: [text]
  API Key: [password ●●●●]
  [Save]
```

All values saved to `site_config` → encrypted for secrets → cache invalidated on save.

---

## 8. Commission & Payout Management

### 8.1 Commission Calculation

Commission is calculated at order creation time:

```ts
// src/lib/commission.ts

async function calculateCommission(
  vendorId: number,
  grossAmount: number   // paise
): Promise<{ rate: number; commission: number; payout: number }> {
  const vendor = await db.query.vendors.findFirst({ where: eq(vendors.id, vendorId) });
  const globalRate = Number(await getConfig('vendor_commission_default')); // basis points

  const rate = vendor?.commission_override ?? globalRate; // basis points
  const commission = Math.round((grossAmount * rate) / 10000);
  const payout = grossAmount - commission;

  return { rate, commission, payout };
}
```

Commission rows are inserted inside the `db.transaction()` of order creation.

### 8.2 Commission Lifecycle

```
order_item created
  → vendor_commission inserted (status=pending)
  → order_vendor_split updated

Order status → 'delivered'
  → PATCH /api/admin/orders/[id] triggers commission.status = 'cleared'
  → vendor's pending_balance increases

Admin initiates payout
  → POST /api/admin/vendors/[id]/payouts
  → vendor_payout created (status=pending)
  → all cleared commissions for vendor → linked to payout via vendor_payout_items
  → payout.status → processing → paid (after admin marks payment done)

Order refunded
  → commission.status → 'on_hold' → 'disputed'
  → vendor_payout deducted if payout already processed (manual reconciliation flagged)
```

### 8.3 Admin Commission Management UI

Route: `/admin/commissions`

Tabs:
1. **Commission Statement** — searchable table: vendor | order | items | gross | rate | commission | payout | status
2. **Pending Payouts** — vendors with cleared balance ≥ min threshold, [Initiate Payout] button
3. **Payout History** — all payouts with status, reference, amount

Route: `/admin/vendors/[id]` — vendor detail including:
- Store info
- Commission rate override (per-vendor)
- Current pending balance
- Payout history
- All products
- Approval actions

### 8.4 Commission Config in Admin Settings

Settings tab "Vendors & Commissions":
- Default commission rate (%) — saved as `vendor_commission_default` in basis points
- Minimum payout amount (₹) — `vendor_min_payout_amount`
- Payout schedule — `vendor_payout_schedule`
- Auto-approve new vendors — `vendor_auto_approve`
- Auto-approve vendor products — `vendor_product_auto_approve`

---

## 9. Refund Management — Multivendor Extension

### 9.1 Existing System

The existing refund system (`refund_requests` + `refund_events`) handles customer-facing refund requests and admin workflow. It stays intact.

### 9.2 Multivendor Extensions

When a refund is approved:
1. Identify which vendor(s) had items in the order
2. For each affected vendor:
   - Find `vendor_commission` rows for those items
   - Set status = `disputed`
   - If vendor has been paid: flag payout for reconciliation
   - Create `refund_events` entry linking the commission dispute
3. Admin sees commission impact in `/admin/commissions` tab

### 9.3 Vendor Refund Visibility

Vendors can see refund requests for their products at `/vendor/orders/[id]` with read-only status. They cannot approve/reject — that stays admin-only.

---

## 10. Order Flow — Multivendor Split

### 10.1 Enhanced Order Creation

```
POST /api/orders
  1. Validate cart items, recalculate prices server-side
  2. For each cart item → find product.vendor_id
  3. Group items by vendor_id
  4. For each vendor group:
     a. Calculate subtotal
     b. Calculate commission (calculateCommission(vendor_id, subtotal))
     c. Insert vendor_commission row
  5. Create order (single row as before)
  6. Create order_vendor_splits (one per unique vendor)
  7. Create order_items (all items, with vendor_id on each)
  8. Decrement stock
  9. Send order confirmation to customer
  10. Send vendor notification to each vendor (email/in-app)
```

### 10.2 Mixed-Vendor Cart

A single checkout can have products from multiple vendors. The customer sees one order, pays once. Internally, each vendor sees only their slice.

### 10.3 Shipping

In Phase 1, shipping is flat-rate per order (existing behavior). Per-vendor shipping rates are reserved for a future phase. The `order_vendor_splits.shipping` column is populated but all set to 0 in Phase 1 (shipping is a platform charge on the parent order).

---

## 11. Admin Panel Extensions

### 11.1 New Admin Routes

| Route | Purpose |
|---|---|
| `/admin/vendors` | Vendor list + approve/suspend |
| `/admin/vendors/[id]` | Vendor detail, products, commissions, payouts |
| `/admin/vendors/[id]/products` | Vendor's products (admin can edit) |
| `/admin/commissions` | Commission statement + payout management |
| `/admin/homepage` | Homepage banner builder |

### 11.2 Updated AdminSidebar

```
Dashboard
Vendors          ← new (E-Commerce module gated)
Orders
Products
Commissions      ← new (E-Commerce module gated)
Refunds
Reviews
Customers
Analytics
Blog
Blog Comments
Media
Homepage         ← new (CMS module gated)
CMS Pages
CMS Menus
WhatsApp
Wallets          (qbiqal only)
SEO
Compliance
Settings
```

### 11.3 Admin Vendor Management

- List vendors: filter by status (pending/approved/suspended)
- Approve/suspend with one click + note
- Email notification on status change
- Per-vendor commission rate override
- View all vendor products with bulk actions
- View vendor payout history + initiate payout

---

## 12. Compliance Pages

The following CMS pages are seeded via `scripts/content-seed.js` (idempotent, production-safe).

| Slug | Title | Type |
|---|---|---|
| `/terms` | Terms & Conditions | policy |
| `/privacy` | Privacy Policy | policy |
| `/refund` | Refund & Cancellation Policy | policy |
| `/returns` | Return & Replacement Policy | policy |
| `/shipping` | Shipping & Delivery Policy | policy |
| `/cookies` | Cookie Policy | policy |
| `/data-protection` | Data Protection & GDPR/DPDP | policy |
| `/consent` | Consent & Data Use | policy |
| `/seller-agreement` | Vendor/Seller Agreement | policy (NEW) |
| `/commission-policy` | Commission & Payout Policy | policy (NEW) |
| `/dispute-resolution` | Dispute Resolution Policy | policy (NEW) |

All policy pages:
- Published by default
- Listed in footer menu "Legal" section
- Module-aware (E-Commerce policies hidden if E-Commerce disabled)
- Full-text content seeded with legally reasonable placeholder text following Indian ecommerce law (Consumer Protection Act 2019, IT Act, DPDP Act 2023)

---

## 13. Phase-by-Phase Development Roadmap

### Phase 0 — Repository & Infrastructure Setup [CURRENT STEP]

**Goal**: Clean slate, new identity, coming soon page deployed.

Tasks:
- [ ] Rename `package.json` name: `apras-naturals` → `buywell-multivendor`
- [ ] Update git remote from `apras-naturals` to `buywell-mutivendor-next`
- [ ] Clean up: remove `frames/`, `videos/`, loose root PNG/HTML files
- [ ] Rename Redis key prefix `an:` → `bw:` in `src/lib/redis.ts` and cache helpers
- [ ] Replace Coming Soon page with BuyWell-branded coming soon
- [ ] Push to `https://github.com/qbiqal/buywell-mutivendor-next` (main branch)
- [ ] Create Coolify resource (Docker, app-server, postgres, redis)
- [ ] Configure build args, env vars, domain `buywell.in` + `www.buywell.in`
- [ ] Verify first deploy shows coming soon

**Deliverable**: buywell.in shows Coming Soon. Auto-deploy on push to main is working.

---

### Phase 1 — Design System + New Homepage [~5 days]

**Goal**: New color palette, new homepage layout with sliding banner hero.

Tasks:
- [ ] Replace CSS variables (new palette, §2.1)
- [ ] Update CustomerHeader: new topbar layout with search bar + orange accent
- [ ] Update Footer: new BuyWell footer layout
- [ ] Create `homepage_banners` table + migration
- [ ] Seed 3 default banners
- [ ] Build `HomeHeroSlider` client component (touch + auto-play)
- [ ] Build `/admin/homepage` banner management page
- [ ] Build banner CRUD API `/api/admin/homepage/banners`
- [ ] Update homepage page.tsx to fetch & render new sections
- [ ] Add category strip (horizontal scroll chips from product_categories)
- [ ] Add "Latest Products" carousel section
- [ ] Remove old scroll-scrub video hero logic
- [ ] Update Admin Settings brand section for new site identity

**Verify**: `npm run verify` passes, homepage matches reference design.

---

### Phase 2 — Multivendor DB + Vendor Role [~4 days]

**Goal**: DB schema extended, vendor role working, vendor application flow.

Tasks:
- [ ] Write migrations: `vendors`, `order_vendor_splits`, `vendor_commissions`, `vendor_payouts`, `vendor_payout_items`
- [ ] Alter `users.role` to include 'vendor'
- [ ] Alter `products.vendor_id`
- [ ] Add vendor-related `site_config` defaults
- [ ] `createVendorGuard()` in `src/lib/middleware.ts`
- [ ] `POST /api/vendor/apply` endpoint
- [ ] Vendor application form page at `/become-vendor`
- [ ] Admin notification on new vendor application

**Verify**: Vendor application → admin sees it → can approve/reject.

---

### Phase 3 — Vendor Panel [~6 days]

**Goal**: Full vendor dashboard, products, orders, payouts.

Tasks:
- [ ] Vendor layout: `src/app/(vendor)/layout.tsx` with animated sidebar
- [ ] Vendor sidebar component (teal theme, mobile drawer)
- [ ] Vendor dashboard: `/vendor/dashboard`
- [ ] Vendor products: `/vendor/products` (CRUD, own products only)
- [ ] Vendor orders: `/vendor/orders` (filtered by vendor_id)
- [ ] Vendor payout screen: `/vendor/payouts`
- [ ] Vendor analytics: `/vendor/analytics`
- [ ] Vendor profile: `/vendor/profile`
- [ ] All vendor APIs: `/api/vendor/*`
- [ ] Vendor proxy.ts route protection

**Verify**: Vendor can log in, manage products, see their orders, view payout balance.

---

### Phase 4 — Multivendor Order Flow + Commissions [~4 days]

**Goal**: Orders correctly split per vendor, commissions calculated and tracked.

Tasks:
- [ ] Update `POST /api/orders` for vendor split logic
- [ ] Create `vendor_commission` + `order_vendor_split` in same transaction
- [ ] Update admin order detail to show per-vendor items
- [ ] Commission status lifecycle (pending → cleared on delivery)
- [ ] `/admin/commissions` UI
- [ ] `/admin/vendors` UI (list, approve, detail)
- [ ] Vendor email notification on new order
- [ ] Payout initiation API + admin UI
- [ ] Per-vendor commission override in admin vendor detail

**Verify**: Multi-vendor order test: order with 2 vendors → 2 commission rows → correct split amounts.

---

### Phase 5 — Razorpay Integration [~3 days]

**Goal**: Online payment via Razorpay working end-to-end.

Tasks:
- [ ] Install `razorpay` npm package
- [ ] `src/lib/payment/razorpay.ts` gateway implementation
- [ ] Update `POST /api/orders` to create Razorpay order when selected
- [ ] `POST /api/orders/[id]/verify-razorpay` HMAC verification
- [ ] `POST /api/webhooks/razorpay` handler (idempotent)
- [ ] Update checkout UI: payment method selector
- [ ] Admin settings "Payments" tab: Razorpay config fields
- [ ] BuyWell Wallet stub gateway (admin config, disabled by default)
- [ ] Test with Razorpay test credentials

**Verify**: Full checkout with Razorpay test card → order marked paid → admin sees payment.

---

### Phase 6 — Admin Extensions + Compliance [~3 days]

**Goal**: Admin vendor management, commission UI, compliance pages updated.

Tasks:
- [ ] `/admin/vendors` list + approve/suspend
- [ ] `/admin/vendors/[id]` detail
- [ ] Commission statement tabs in `/admin/commissions`
- [ ] New compliance pages: seller-agreement, commission-policy, dispute-resolution
- [ ] Update footer menu to include new legal pages
- [ ] Update DPDP/GDPR compliance checklist for multivendor context

**Verify**: `npm run verify` passes. All pages accessible.

---

### Phase 7 — Polish, SEO, QA [~2 days]

**Goal**: Production-ready, tested, deployed.

Tasks:
- [ ] SEO metadata for new homepage, vendor store pages
- [ ] Vendor store public page: `/vendors/[slug]`
- [ ] Product page shows vendor name + link to vendor store
- [ ] Sitemap includes vendor store pages
- [ ] Update CLAUDE.md, mind-map.md, roadmap.md
- [ ] Full `npm run verify`
- [ ] Deploy to coolify, verify buywell.in

---

## 14. Coolify Deployment

### 14.1 Infrastructure Map

```
qbiqal-coolify        10.0.0.2  Control plane (Coolify UI)
qbiqal-app-server     10.0.0.4  Docker containers run here
qbiqal-postgres       10.0.0.5  Shared PostgreSQL 17
qbiqal-redis          10.0.0.3  Shared Redis 7
```

### 14.2 Coolify Resource Configuration

**Type**: Docker Compose or Dockerfile build  
**Server**: Qbiqal-app-server  
**Repository**: `https://github.com/qbiqal/buywell-mutivendor-next`  
**Branch**: `main`  
**Build Command**: `docker build` from `Dockerfile`  
**Port**: `3000`

**Environment Variables** (set in Coolify → Project → Environment Variables):

```env
NODE_ENV=production
DATABASE_URL=postgres://bw_user:PASSWORD@10.0.0.5:5432/buywell_multivendor_db
REDIS_URL=redis://10.0.0.3:6379
JWT_SECRET=<strong-random-32-chars>
APP_URL=https://buywell.in
NEXT_PUBLIC_APP_URL=https://buywell.in
CONFIG_ENCRYPTION_KEY=<strong-random-32-chars>
```

**Domain**: `buywell.in`, `www.buywell.in` → Coolify handles Let's Encrypt SSL.

### 14.3 Database Setup

On `qbiqal-postgres`:
```sql
CREATE USER bw_user WITH PASSWORD 'STRONG_PASSWORD';
CREATE DATABASE buywell_multivendor_db OWNER bw_user;
GRANT ALL PRIVILEGES ON DATABASE buywell_multivendor_db TO bw_user;
```

Startup script `scripts/startup.js` runs migrations automatically on container start.

### 14.4 Redis

The shared Redis on `10.0.0.3` is used. BuyWell Multivendor uses prefix `bw:` (distinct from `an:` used by Apras Naturals if both are running on same Redis). This avoids key collisions between projects.

---

## 15. CI/CD Pipeline

### 15.1 GitHub Actions Workflow

File: `.github/workflows/deploy.yml`

```yaml
name: Deploy to Coolify

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Coolify Deploy
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.COOLIFY_TOKEN }}" \
            -H "Content-Type: application/json" \
            "${{ secrets.COOLIFY_WEBHOOK_URL }}"
```

### 15.2 Secrets Required in GitHub

| Secret | Value |
|---|---|
| `COOLIFY_TOKEN` | `27\|KTKUcuqSodOoYKWHMEGzfhSW3H3ijezTVW0m59Zq0679f632` |
| `COOLIFY_WEBHOOK_URL` | Webhook URL from Coolify resource (set after resource creation) |

### 15.3 Coolify Webhook

In Coolify: Resource → Webhooks → copy Deploy Webhook URL → add to GitHub secret `COOLIFY_WEBHOOK_URL`.

---

## Appendix A — File Structure Additions

```
src/
  app/
    (vendor)/
      layout.tsx             ← Vendor shell + sidebar
      vendor/
        dashboard/page.tsx
        products/page.tsx
        products/new/page.tsx
        products/[id]/edit/page.tsx
        orders/page.tsx
        orders/[id]/page.tsx
        payouts/page.tsx
        analytics/page.tsx
        profile/page.tsx
    api/
      vendor/
        apply/route.ts
        dashboard/route.ts
        products/route.ts
        products/[id]/route.ts
        orders/route.ts
        orders/[id]/route.ts
        orders/[id]/ship/route.ts
        payouts/route.ts
        analytics/route.ts
        profile/route.ts
      admin/
        vendors/route.ts
        vendors/[id]/route.ts
        vendors/[id]/products/route.ts
        vendors/[id]/payouts/route.ts
        commissions/route.ts
        homepage/
          banners/route.ts
          banners/[id]/route.ts
          banners/reorder/route.ts
      webhooks/
        razorpay/route.ts
      orders/
        [id]/
          verify-razorpay/route.ts
  components/
    vendor/
      VendorSidebar.tsx
      VendorHeader.tsx
    homepage/
      HomeHeroSlider.tsx
      HomeCategoryStrip.tsx
      HomePromoRow.tsx
  lib/
    payment/
      razorpay.ts            ← new
      bwallet.ts             ← stub, Part 2
    commission.ts            ← new
    vendor.ts                ← vendor helpers
  db/
    schema.ts                ← add vendors, banners, splits, commissions, payouts
```

---

## Appendix B — Key Config Keys Reference

| Key | Default | Purpose |
|---|---|---|
| `multivendor_enabled` | true | Master multivendor switch |
| `vendor_auto_approve` | false | Auto-approve new vendor applications |
| `vendor_commission_default` | 1000 | Default commission in basis points (10%) |
| `vendor_min_payout_amount` | 50000 | Minimum payout in paise (₹500) |
| `vendor_payout_schedule` | weekly | Payout frequency |
| `payment_razorpay_enabled` | true | Razorpay active |
| `payment_razorpay_test_mode` | true | Use test credentials |
| `payment_bwallet_enabled` | false | BuyWell Wallet (Part 2) |
| `homepage_hero_autoplay_ms` | 4000 | Banner auto-advance interval |
| `homepage_hero_show_dots` | true | Show dot navigation |
| `homepage_hero_show_arrows` | true | Show prev/next arrows |

---

*End of Part 1 Blueprint*  
*See `docs/part2.md` for BuyWell Global integration.*
