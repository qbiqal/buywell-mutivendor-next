# BuyWell Multivendor Marketplace — Platform Mind Map

> Last updated: 2026-06-13
> Current state: Multi-vendor marketplace is active; Part 2 Integration complete; `/` is the new homepage.

---

## 1. Platform Map

```txt
BuyWell Multivendor Marketplace
├── Core
│   ├── Auth: JWT cookie `bw_token`
│   ├── Users: customer/vendor/admin/qbiqal + `bw_user_id` link
│   ├── Settings: DB-backed `site_config`
│   ├── Cache: Redis `bw:` namespace
│   ├── Health: /api/health
│   ├── Module registry/state
│   ├── Notification provider facade
│   ├── Notification wallets: WhatsApp/email/SMS credits + ledger
│   ├── OTP: email verification + password reset + BuyWell Global link OTP
│   ├── Rate limiting: Redis fixed windows
│   ├── Same-site API mutation hardening
│   ├── Rich HTML sanitizer
│   ├── Observability: Sentry envelope capture
│   ├── Brand logos: admin logo + website logo via DB config
│   ├── Compliance: GDPR/DPDP checklist + Multi-vendor policy coverage
│   └── /admin/media
│
├── Multivendor Module
│   ├── /vendor/* (Vendor Portal)
│   ├── /admin/vendors (Vendor Approval/Management)
│   ├── /admin/payouts (Payout Processing)
│   ├── vendors
│   ├── order_vendor_splits
│   ├── vendor_commissions
│   ├── vendor_payouts
│   ├── /become-vendor application flow
│   └── Commission calculation + payout lifecycle
│
├── CMS Module
│   ├── / (Homepage with Hero Slider)
│   ├── /admin/homepage (Banner management)
│   ├── /admin/cms (Section/Page/Menu management)
│   ├── homepage_banners
│   ├── cms_sections, cms_pages, cms_menus
│   └── Policy CMS pages including Seller Agreement & Commission Policy
│
├── SEO Module
│   ├── /admin/seo
│   ├── seo_page_overrides
│   ├── Dynamic sitemap + robots
│   └── Traffic events analytics
│
├── E-Commerce Module
│   ├── /shop, /shop/[slug]
│   ├── CartDrawer + CartContext
│   ├── /checkout, /orders, /profile
│   ├── /admin/orders, /admin/products, /admin/customers
│   └── products, variants, images, orders, order_items
│
├── Blog Module
│   ├── /blog, /blog/[slug]
│   ├── /admin/blog
│   └── blog_posts, categories, comments
│
└── Payment Modules
    ├── offline_qr
    ├── razorpay (Integrated Gateway)
    └── bwallet (BuyWell Global E-Commerce Wallet)
```

---

## 2. Route Map

```txt
Public
  /                         New Multi-vendor Homepage
  /shop                     Product listing
  /shop/[slug]              Product detail
  /vendors/[slug]           Vendor store page
  /blog                     Blog listing
  /become-vendor            Vendor application form
  /profile/link-bwallet     Account linking (OTP flow)
  /checkout                 Checkout
  /checkout/payment         Payment selection (Wallet + QR/Razorpay)
  /checkout/confirmation    Confirmation

Vendor Portal (/vendor/*)
  /vendor/dashboard         Sales overview
  /vendor/products          Product management
  /vendor/orders            Order management
  /vendor/payouts           Payout balance & history
  /vendor/settings          Store profile

Admin (/admin/*)
  /admin/dashboard          Overview
  /admin/vendors            Vendor approval & list
  /admin/payouts            Payout management
  /admin/commissions        Commission statement
  /admin/orders             Order list
  /admin/products           Product list
  /admin/homepage           Banner management
  /admin/settings           Site & Payment config
  /admin/reports/bw-linked-accounts  Linking report
  /admin/reports/wallet-transactions Wallet logs
```

---

## 3. Order & Commission Flow

```txt
Customer
  -> /checkout
  -> POST /api/orders
     -> Groups items by vendorId
     -> Creates order_vendor_splits
  -> Payment (Wallet and/or Razorpay/Offline QR)
  -> verifyPayment / pay-wallet
     -> Triggers createVendorSplitsForOrder
     -> Calculates commissions (gross * rate)
     -> Inserts vendor_commissions (status: pending)
     -> Increments vendor denormalized stats

Admin
  -> /admin/orders (Status -> Delivered)
  -> /admin/payouts
     -> Initiate Payout for vendor's cleared balance
     -> Creates vendor_payouts (status: processing)
     -> Commissions marked as 'cleared'
     -> Admin marks as 'paid' after bank transfer
```

---

## 4. Production Risk Map

| Risk | Status |
|---|---|
| Multi-vendor Commission Accuracy | ✅ Built with basis-point precision |
| Razorpay Webhook Security | ✅ HMAC signature verification built |
| Wallet Debit Idempotency | ✅ Idempotency keys + backend ledger |
| Vendor Data Privacy | ✅ Scoped vendor panel access built |
| Redis Namespace Collision | ✅ Updated to `bw:` prefix |
| SEO for Vendor Stores | ✅ Phase 7 complete |

---

## 5. Next Work Order

1. 🟡 Monitor production wallet integration.
2. ❌ Part 3: MLM tree visualization in Marketplace (Optional).
