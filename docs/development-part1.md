# APRAS Naturals — Development Blueprint Part 1
## Product Vision, Architecture & Project Setup

> Next.js 16.2.2 · TypeScript · PostgreSQL 17 + PgBouncer · Redis 7 · Coolify CI/CD
> Infrastructure: Shared Hetzner cluster (Coolify + App Server + PG + Redis)
> **DO NOT START DEVELOPMENT UNTIL USER APPROVES ALL PARTS**

---

## 1. PRODUCT OVERVIEW

**APRAS Naturals** is a full-stack CMS + E-Commerce + Blog platform for an authorized Prakvedaa partner selling mono-floral honey (Tulsi, Karanj, Moringa — 500g/1kg) and A2 Bilona Ghee. The platform supports offline QR-code-based payment, WhatsApp order confirmation, admin-verified order management, and a configurable CMS for the landing page.

```
APRAS Naturals Platform
├── Public Landing Page         (same hero + scroll video, all sections CMS-configurable)
├── Shop / Product Pages        (listing, detail, cart)
├── Checkout + Offline Payment  (QR code upload proof, WhatsApp notify)
├── Customer Portal             (order tracking, roadmap, profile)
├── Admin Panel                 (orders, products, CMS, blog, media, analytics)
└── Blog                       (CMS-driven, grid/list/detail views)
```

**Business rules:**
- No payment gateway — orders placed → customer scans QR → uploads payment proof ( create provison for payment gateway where we can add new payment gateways later , offline payment gatewaya is one of them..)
- Admin verifies proof → confirms order via WhatsApp → fulfills
- Free samples offered to select customers (admin-controlled feature)
- Products: 3 honey variants × 2 sizes + Ghee variants

---

## 2. TECH STACK

```
Frontend
├── Next.js 16.2.2 (App Router, Turbopack)
├── React 19+ · TypeScript 6.0
├── Custom CSS (NO shadcn, NO Radix, NO Tailwind UI libs)
├── CSS Variables + CSS Modules pattern (like StockSense globals.css)
├── Framer Motion (scroll/entrance animations)
├── react-beautiful-dnd / dnd-kit (drag & drop uploader)
└── react-image-crop (auto-crop utility)

Backend
├── Next.js API Routes (App Router route.ts convention)
├── PostgreSQL 17 via Drizzle ORM 0.45+
├── Redis 7 (ioredis) — namespace: an: (apras-naturals)
├── JWT (jose) + bcryptjs — cookie-based sessions
└── Nodemailer / Resend (order confirmation emails)

Notifications
├── WhatsApp via Meta Cloud API (order alerts to admin)
├── SMS via MSG91 or Twilio (order status to customer)
└── In-app notifications (customer portal)

Media
├── Local uploads → /public/uploads (dev)
├── Cloudflare R2 (prod) — namespace: apras-naturals/
└── Image processing: sharp (resize/crop on upload)

Monitoring
├── Sentry (client + server errors)
└── Health endpoint: /api/health

Deployment
├── Coolify on qbiqal-app-server (178.104.105.31)
├── GitHub repo: qbiqal/apras-naturals
├── Namespace in PG: apras_naturals_db
├── Namespace in Redis: an: prefix
└── CI/CD: Coolify webhook on push to main
```

---

## 3. INFRASTRUCTURE MAPPING

```
qbiqal-coolify:    10.0.0.2  | 178.104.149.128 | CX22 | Control plane
qbiqal-app-server: 10.0.0.4  | 178.104.105.31  | CX32 | App (Docker via Coolify)
qbiqal-postgres:   10.0.0.5  | 178.104.158.232 | CCX13| PG 17 + PgBouncer :6432
qbiqal-redis:      10.0.0.3  | 178.104.158.112 | CX23 | Redis 7 :6379

Current apps on shared infra:
├── Blog Platform     → blog_db   (PG) | blog: (Redis)
├── StockSense        → stock_research (PG) | ss: (Redis)
└── APRAS Naturals    → apras_naturals_db (PG) | an: (Redis)  ← NEW

PgBouncer additions needed: ( for this project we will not use pg bouncer ..later if we will need ..we will change the url so make everything pg bouncer ready..)
  apras_naturals = host=127.0.0.1 port=5432 dbname=apras_naturals_db

Redis isolation (automatic via ioredis keyPrefix):
  an:*     → App cache, sessions, rate limits
  bull:an:* → BullMQ queues (if any async jobs needed)
```

---

## 4. REPOSITORY STRUCTURE

```
apras-naturals/
├── src/
│   ├── app/
│   │   ├── (public)/                    # Public routes (no auth)
│   │   │   ├── page.tsx                 # Landing page (SSR, CMS-driven)
│   │   │   ├── shop/page.tsx            # Product listing
│   │   │   ├── shop/[slug]/page.tsx     # Product detail
│   │   │   ├── blog/page.tsx            # Blog listing
│   │   │   ├── blog/[slug]/page.tsx     # Blog post detail
│   │   │   └── layout.tsx
│   │   ├── (customer)/                  # Customer portal (auth required)
│   │   │   ├── orders/page.tsx          # Order list
│   │   │   ├── orders/[id]/page.tsx     # Order detail + tracking
│   │   │   ├── profile/page.tsx
│   │   │   └── layout.tsx              # Top nav (StockSense member style)
│   │   ├── (admin)/                     # Admin panel (admin role)
│   │   │   ├── admin/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── orders/
│   │   │   │   ├── products/
│   │   │   │   ├── blog/
│   │   │   │   ├── media/
│   │   │   │   ├── cms/                 # Landing page config
│   │   │   │   ├── customers/
│   │   │   │   ├── analytics/
│   │   │   │   ├── whatsapp/
│   │   │   │   └── settings/
│   │   │   └── layout.tsx              # Left sidebar (StockSense admin style)
│   │   ├── (auth)/                      # Login/register
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── checkout/                    # Checkout flow
│   │   │   ├── page.tsx
│   │   │   ├── payment/page.tsx         # QR code payment
│   │   │   └── confirmation/page.tsx
│   │   ├── api/                         # API routes
│   │   │   ├── auth/
│   │   │   ├── products/
│   │   │   ├── orders/
│   │   │   ├── blog/
│   │   │   ├── cms/
│   │   │   ├── media/
│   │   │   ├── admin/
│   │   │   └── health/route.ts
│   │   └── layout.tsx                  # Root layout
│   │
│   ├── components/
│   │   ├── ui/                          # Primitive components (no deps)
│   │   │   ├── Button/
│   │   │   ├── Card/
│   │   │   ├── Modal/
│   │   │   ├── Toast/
│   │   │   ├── Badge/
│   │   │   ├── Spinner/
│   │   │   └── Input/
│   │   ├── layout/
│   │   │   ├── CustomerHeader/          # Top nav (StockSense member pattern)
│   │   │   ├── AdminSidebar/            # Left sidebar (StockSense admin pattern)
│   │   │   ├── PublicNav/               # Landing page nav
│   │   │   └── Footer/
│   │   ├── media/
│   │   │   ├── MediaUploader/           # Drag & drop + auto-crop (dnd-kit)
│   │   │   ├── ImageCropper/            # react-image-crop wrapper
│   │   │   └── MediaGallery/
│   │   ├── shop/
│   │   │   ├── ProductCard/
│   │   │   ├── ProductGrid/
│   │   │   ├── ProductDetail/
│   │   │   ├── Cart/
│   │   │   └── CartDrawer/
│   │   ├── checkout/
│   │   │   ├── CheckoutForm/
│   │   │   ├── PaymentQR/               # QR code display + upload proof
│   │   │   └── OrderConfirmation/
│   │   ├── blog/
│   │   │   ├── BlogGrid/
│   │   │   ├── BlogList/
│   │   │   ├── BlogCard/
│   │   │   └── BlogDetail/
│   │   ├── landing/                     # CMS-driven landing sections
│   │   │   ├── HeroSection/
│   │   │   ├── ProductsSection/
│   │   │   ├── AboutSection/
│   │   │   ├── TestimonialsSection/
│   │   │   └── CTASection/
│   │   └── admin/
│   │       ├── OrderTable/
│   │       ├── ProductForm/
│   │       ├── BlogEditor/              # Rich text + media uploader
│   │       ├── CMSEditor/               # Landing page CMS blocks editor
│   │       └── AnalyticsWidget/
│   │
│   ├── lib/
│   │   ├── db/
│   │   │   ├── schema.ts                # All table definitions (Drizzle)
│   │   │   ├── seed.ts                  # Idempotent seeder
│   │   │   ├── indexes.ts               # Performance indexes
│   │   │   └── migrations/              # Auto-generated SQL files
│   │   ├── redis.ts                     # ioredis client (keyPrefix: "an:")
│   │   ├── cache.ts                     # 3-layer cache (L1/L2/L3)
│   │   ├── auth.ts                      # JWT helpers (jose)
│   │   ├── middleware.ts                # Auth guards
│   │   ├── errors.ts                    # AppError, handleApiError
│   │   ├── media.ts                     # Upload + sharp processing
│   │   ├── whatsapp.ts                  # Meta Cloud API integration
│   │   ├── email.ts                     # Resend / Nodemailer
│   │   └── config.ts                    # DB-backed KV config store
│   │
│   ├── types/
│   │   └── index.ts
│   └── proxy.ts                         # Route protection (Next.js 16 pattern)
│
├── scripts/
│   ├── startup.js                       # migrations → seed → server
│   └── config-seed.js                   # Idempotent config defaults
├── public/
│   ├── uploads/                         # Local media (dev only)
│   └── images/                          # Static assets
├── Dockerfile                           # Multi-stage (deps→builder→runner)
├── docker-compose.yml                   # Local dev
├── drizzle.config.ts
├── next.config.ts
├── tsconfig.json
├── CLAUDE.md                            # AI agent instructions
└── agent.md                             # Development agent guide
```

---

## 5. CSS / DESIGN SYSTEM

**Philosophy**: Custom CSS Variables (no Tailwind, no shadcn). Same approach as StockSense globals.css.

```css
/* globals.css structure */
:root {
  /* Brand */
  --amber:         #D97706;
  --amber-lt:      #F59E0B;
  --amber-dk:      #92400E;
  --honey:         #FEF3C7;
  --ink:           #18110a;
  --muted:         #6b5e50;

  /* Layout */
  --header-height: 64px;
  --sidebar-width: 240px;

  /* UI */
  --bg-primary:    #f8f8f8;
  --bg-secondary:  #f2f2f2;
  --bg-card:       #ffffff;
  --text-primary:  #18110a;
  --text-secondary:#6b5e50;
  --border-color:  #e8e0d5;
  --accent:        #D97706;

  /* Admin sidebar */
  --sidebar-bg:    #1c0f03;
  --sidebar-text:  rgba(255,255,255,0.7);
  --sidebar-active:#FBBF24;

  /* Shadows */
  --card-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
  --card-shadow-hover: 0 8px 32px rgba(0,0,0,0.1);
}
```

**Customer portal** uses **top navigation** (exactly like StockSense member layout):
- Fixed top bar 64px, amber + white theme
- Content area: full width with container

**Admin panel** uses **left sidebar** (exactly like StockSense admin layout):
- 240px left sidebar, dark amber/brown theme
- Content area: remainder of screen

---

## 6. AUTHENTICATION

```
Two roles: customer | admin

JWT (jose) — HS256 — stored in httpOnly cookie (an_token)
- Expiry: 7 days
- Payload: { sub: userId, role: "customer"|"admin", email }

Auth pattern (same as StockSense):
  createAuthGuard()  → protects customer routes
  createAdminGuard() → protects admin routes
  getAuthPayload()   → reads JWT from cookie

Session store: Redis an:session:{userId} (TTL 7d) for revocation
```

---

## 7. API CONVENTIONS

```typescript
// Route: src/app/api/[resource]/route.ts
export async function GET(req: NextRequest) {
  const authResult = await createAuthGuard()(req);
  if (authResult) return authResult;
  // ...
  return NextResponse.json({ success: true, data: result });
}

// Error: return NextResponse.json({ success: false, error: "msg" }, { status: 400 })

// All paginated lists:
{ success: true, data: [...], pagination: { page, limit, total, pages } }
```

---

## 8. KEY PATTERNS FROM STOCKSENSE TO REPLICATE

| Pattern | StockSense | APRAS Naturals |
|---------|-----------|----------------|
| DB config store | `appConfig` table + `getAppConfigValue()` | `siteConfig` table + `getSiteConfig()` |
| 3-layer cache | L1 (Redis) → L2 (DB materialized) → L3 (direct) | Same pattern for products/CMS/blog |
| Auth guard | `createAuthGuard()` middleware | Same pattern |
| Startup script | `startup.js` runs migrations → seed → server | Same pattern |
| Dockerfile | Multi-stage node:24-alpine | Same |
| Redis namespace | `ss:` prefix | `an:` prefix |
| PG namespace | `stock_research` db | `apras_naturals_db` |
| DB schema | Drizzle ORM, `schema.ts` | Same |
| Idempotent seed | `ON CONFLICT DO NOTHING` | Same pattern |
| Error handling | `AppError`, `handleApiError` | Same |
| Dark/light toggle | CSS variables + `.dark` class | Admin panel supports dark mode |

---

## 9. ENVIRONMENT VARIABLES

```bash
# Core
DATABASE_URL=postgresql://apras_user:PASSWORD@178.104.158.232:6432/apras_naturals_db
PGBOUNCER=true
REDIS_URL=redis://:PASSWORD@178.104.158.112:6379
JWT_SECRET=<64 char hex>
NEXT_PUBLIC_APP_URL=https://aprasnaturals.com
NODE_ENV=production

# Media
CLOUDFLARE_R2_ACCOUNT_ID=
CLOUDFLARE_R2_ACCESS_KEY_ID=
CLOUDFLARE_R2_SECRET_ACCESS_KEY=
CLOUDFLARE_R2_BUCKET_NAME=apras-naturals-media
CLOUDFLARE_R2_PUBLIC_URL=https://media.aprasnaturals.com

# Notifications
WHATSAPP_PHONE_NUMBER_ID=        # Meta Cloud API
WHATSAPP_ACCESS_TOKEN=           # Meta Cloud API
ADMIN_WHATSAPP_NUMBER=+919470309006
RESEND_API_KEY=                  # Email

# Monitoring
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_ORG=qbiqal
SENTRY_PROJECT=apras-naturals
INTERNAL_API_TOKEN=              # For health/internal routes
```

---

## 10. GITHUB REPO SETUP CHECKLIST

```bash
# 1. Create repo via GitHub API or UI
gh repo create qbiqal/apras-naturals --private --description "APRAS Naturals CMS + E-Commerce Platform"

# 2. Install Next.js
npx create-next-app@16.2.2 apras-naturals \
  --typescript --app --no-tailwind --no-eslint --no-src-dir

# Actually use src dir: --src-dir

# 3. Install deps
npm install drizzle-orm @neondatabase/serverless ioredis jose bcryptjs \
  @anthropic-ai/sdk nodemailer resend \
  framer-motion @dnd-kit/core @dnd-kit/sortable react-image-crop sharp \
  sentry @sentry/nextjs

npm install -D drizzle-kit tsx @types/bcryptjs @types/nodemailer

# 4. Configure Coolify webhook (see Part 3)
# 5. Add env vars in Coolify
# 6. First deploy → run DB setup
```
