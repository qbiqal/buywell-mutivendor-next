# APRAS Naturals — Development Blueprint Part 3
## Deployment, Operations, Roadmap Process, and Production Checklist

> Last updated: 2026-05-30
> Production target: Docker deployment through Coolify.
> Local target: local PostgreSQL + local Redis via `.env.local`.

---

## 1. Deployment Model

Production uses Docker through Coolify.

Flow:

```txt
git push main
  -> GitHub webhook
  -> Coolify pulls repo
  -> Docker build
  -> Next standalone output
  -> container startup.js
  -> DB migrations
  -> config seed
  -> Next server
  -> /api/health
```

Important:

- Local development does not require Docker.
- Production deployment should not depend on local `.env.local`.
- Direct PostgreSQL `:5432` is the current DB decision; keep code compatible with future PgBouncer.

---

## 2. Local Operations

The local database has already been created and initialized.

```bash
set -a; . ./.env.local; set +a
npm run db:migrate
npm run db:seed
node -e "require('./scripts/config-seed.js')().then(()=>console.log('config defaults seeded'))"
npm run db:indexes
npm run build
```

Local verification completed:

- ✅ PostgreSQL running.
- ✅ Redis running.
- ✅ `apras_user` role exists.
- ✅ `apras_naturals_db` exists.
- ✅ Migrations applied.
- ✅ Seed data loaded.
- ✅ Config defaults loaded.
- ✅ 42 indexes created.
- ✅ `npm run verify` passes.

Note: the local `node_modules/.bin/next` shim was repaired to point at `next/dist/bin/next` after it resolved relative imports from the wrong directory.

---

## 3. Production Environment Variables

```bash
DATABASE_URL=postgresql://apras_user:YOUR_PASSWORD@178.104.158.232:5432/apras_naturals_db
REDIS_URL=redis://:YOUR_REDIS_PASSWORD@178.104.158.112:6379
JWT_SECRET=GENERATE_64_CHAR_HEX
NEXT_PUBLIC_APP_URL=https://aprasnaturals.com
NODE_ENV=production

CLOUDFLARE_R2_ACCOUNT_ID=
CLOUDFLARE_R2_ACCESS_KEY_ID=
CLOUDFLARE_R2_SECRET_ACCESS_KEY=
CLOUDFLARE_R2_BUCKET_NAME=apras-naturals-media
CLOUDFLARE_R2_PUBLIC_URL=https://media.aprasnaturals.com

WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=
ADMIN_WHATSAPP_NUMBER=+919470309006

RESEND_API_KEY=
SMS_API_KEY=
SMS_SENDER_ID=
SMS_AUTH_TOKEN=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
WEB_PUSH_VAPID_PUBLIC_KEY=
WEB_PUSH_VAPID_PRIVATE_KEY=
WEB_PUSH_VAPID_SUBJECT=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
CONFIG_ENCRYPTION_KEY=
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
INTERNAL_API_TOKEN=
```

---

## 4. Docker Notes

The current Dockerfile uses:

- Node 24 Alpine.
- `npm ci`.
- `npm run build`.
- standalone Next output.
- `scripts/startup.js`.
- `/api/health` health check.

Keep these rules:

- Do not run `db:push` in production.
- Do run migrations through startup.
- Keep `DATABASE_URL` required in production.
- Keep config seed idempotent.
- Do not commit `.env.local`.
- Provider/API keys can be entered in Admin Settings; `.env` values are fallback only when DB config is empty.
- Secret provider keys are encrypted at rest when an app secret/encryption key is configured.

---

## 5. Roadmap Update Process

`docs/roadmap.md` is the source of truth for current build status.

After each phase:

1. Mark completed items ✅ in `docs/roadmap.md`.
2. Update `CLAUDE.md`.
3. Update `docs/mind-map.md`.
4. Run `npm run build`.
5. If schema changed, create/apply migration and update schema notes.
6. If routes changed, update the API/route inventory.

Do not mark a feature complete if:

- It uses dummy data.
- The page exists but API is missing.
- The API exists but auth is missing.
- The feature compiles but has no persistence.
- The module can be toggled in UI but routes/APIs still remain active.

Architecture rule:

- Keep the main platform as a Next.js modular monolith.
- Add NestJS only later for independent heavy engines such as MLM ledgers, commission jobs, payout workers, or external APIs.
- Every phase must keep CMS-only and Blog-only deployments lightweight.

---

## 6. Current Roadmap Snapshot

### ✅ Completed

- Foundation and deployment skeleton.
- Local DB/Redis setup.
- DB schema, migrations, seed, config seed, indexes.
- Auth APIs and route protection.
- UI primitives and layout shells.
- `/` full CMS homepage root.
- `/home` CMS homepage alias.
- `/coming-soon` previous Coming Soon page.
- Shop listing and product detail.
- Cart context and CartDrawer.
- Checkout, sample request, QR payment proof upload.
- Customer orders and profile.
- Admin dashboard, orders, products, blog, CMS list, settings.
- Admin customers list/detail.
- Admin media library.
- Admin analytics.
- Admin WhatsApp operations.
- CMS section detail editor.
- Blog category admin.
- Module control plane and admin module toggles.
- Dynamic cart provider/header imports behind E-Commerce module state.
- Payment abstraction, registry-backed order flow, and Offline QR gateway.
- Server-side order price recalculation, signed proof upload token, and stock decrement.
- MediaUploader and admin-authenticated upload API.
- Cloudflare R2 signed upload helper.
- Same-site API mutation hardening.
- Sentry server-side capture path.
- Secret config encryption and external key admin provisions.
- Rich HTML sanitization for admin-authored blog/product content.

### 🟡 Partial

- SMS/Telegram/Web Push sender adapters depend on final provider selection; settings slots and env fallbacks are complete.
- Future heavy MLM/payment modules still need deeper `src/modules/<module>/` package boundaries before implementation.

### ❌ Pending

- Seed admin password rotation or first-admin setup.

---

## 7. Phase Plan

### Phase A — Module Control Plane

Goal: make Core/CMS/E-Commerce/Blog/Payment module state real.

- ✅ Create `src/lib/modules.ts`.
- ✅ Add module config defaults.
- ✅ Add `isModuleEnabled()` and page/API guards.
- ✅ Add admin module settings UI.
- ✅ Generate AdminSidebar from enabled modules.
- ✅ Gate public pages, admin pages, and APIs.
- ✅ Add disabled-module handling.
- ✅ Register Offline QR as a payment module.

Completion rule: when Blog is disabled, `/blog`, `/admin/blog`, and Blog APIs must stop loading/serving Blog behavior.

### Phase B — Admin Customers

- ✅ Customer list with search/pagination.
- ✅ Customer detail with addresses and orders.
- ✅ Customer active/inactive toggle.
- ✅ Customer spend/order aggregates.

### Phase C — Admin Media

- ✅ Media grid/list.
- ✅ Folder/type filters.
- ✅ Preview modal.
- ✅ Copy URL.
- ✅ Delete with reference checks.
- ✅ Alt text update.
- ✅ Folder update.
- ✅ Upload from media library.

### Phase D — Analytics

- ✅ Revenue charts.
- ✅ Orders by status.
- ✅ Payment verification metrics.
- ✅ Product performance.
- ✅ Customer growth.
- ✅ CSV export.

### Phase E — WhatsApp

- ✅ Admin send panel.
- ✅ Template management.
- ✅ Per-order resend action.
- ✅ Delivery logs.

### Phase F — Auth, Notification, OTP, SEO

- ✅ `sitemap.ts`.
- ✅ `robots.ts`.
- ✅ Forgot/reset password and email verification OTP.
- ✅ Resend-backed notification provider facade with admin API key setting.
- ✅ In-app notifications and delivery logs.
- ✅ Push subscription storage provision.
- ✅ Redis auth rate limiter.
- ✅ Product/blog metadata and OG/Twitter metadata.
- ✅ Same-site mutation hardening.
- ✅ Signed payment-proof upload token.
- ✅ Proper Cloudflare R2 signing.
- ✅ Sentry server-side capture path.
- ✅ E2E order test.
- ✅ Admin external key provisions with `.env` fallback.
- ✅ Secret config encryption at rest.

### Phase G — Launch Switch

- ✅ Move CMS landing from `/home` to `/` for the current local build.
- ✅ Keep `/home` as an alias.
- ✅ Move Coming Soon to `/coming-soon`.
- ❌ Decide final public launch date.
- ❌ Confirm enabled modules.
- ❌ Confirm real QR/UPI config.
- ❌ Change seed admin password.
- ❌ Verify WhatsApp, email, R2, health, and domain.

---

## 8. Production Checklist

### Infrastructure

- [ ] PostgreSQL database exists on production server.
- [ ] Production DB user has correct permissions.
- [ ] Redis reachable from app server.
- [ ] Coolify resource configured.
- [ ] Domain configured in Coolify.
- [ ] Cloudflare DNS and SSL verified.

### Application

- [ ] All production env vars set.
- [ ] `JWT_SECRET` is strong and private.
- [ ] `CONFIG_ENCRYPTION_KEY` is strong and private, or `JWT_SECRET` is accepted as the encryption fallback.
- [ ] Migrations apply on startup.
- [ ] Config seed does not overwrite admin changes.
- [ ] Default admin password changed or forced rotation implemented.
- [ ] `/api/health` passes.
- [ ] `npm run build` passes in Docker.

### External Services

- [ ] Cloudflare R2 bucket and credentials configured.
- [x] R2 upload implementation hardened with S3-compatible signing.
- [ ] WhatsApp Meta API credentials configured.
- [ ] Resend configured and domain verified.
- [ ] Sentry configured.

### Feature QA

- [ ] Register/login/logout.
- [ ] Add product to cart.
- [ ] Checkout as guest.
- [ ] Checkout as customer.
- [ ] Upload payment proof.
- [ ] Signed proof upload token accepted and expired/invalid token rejected.
- [ ] Admin verifies payment.
- [ ] Admin ships order with tracking.
- [ ] Customer sees updated timeline.
- [ ] Blog publish/update.
- [ ] CMS section toggle/update.
- [ ] CMS section JSON editor save/reset.
- [ ] Blog category add/edit/delete.
- [ ] Module disable hides nav, pages, and APIs.

---

## 9. Known Production Risks

| Risk | Severity | Action |
|---|---|---|
| Seed admin password | 🔴 High | Force change or implement first-admin setup |
| No login/recovery rate limit | ✅ Built | Redis limiter added |
| Payment proof upload public by order ID | ✅ Built | Signed order token added |
| R2 helper signing | ✅ Built | S3-compatible request signing added |
| Inventory decrement | ✅ Built | Stock decrements in order transaction |
| Sitemap/robots | ✅ Built | Keep module-aware sitemap maintained |
| Secret config storage | ✅ Built | Secret keys are encrypted when app secret exists |
| SMS/Telegram/Web Push send adapters | 🟡 Medium | Add after provider/vendor is selected |

---

## 10. Commands

```bash
npm run dev
npm run build
npm run db:generate
npm run db:migrate
npm run db:push
npm run db:seed
npm run db:indexes
npm run db:studio
npm run smoke
npm run e2e
npm run verify
```

For local DB-backed commands:

```bash
set -a; . ./.env.local; set +a
```

---

## 11. Current Build Result

Latest verified route output includes:

- `/`
- `/home`
- `/shop`, `/shop/[slug]`
- `/blog`, `/blog/[slug]`
- `/checkout`, `/checkout/payment`, `/checkout/confirmation`
- `/orders`, `/orders/[id]`
- `/profile`
- `/admin/dashboard`
- `/admin/orders`, `/admin/orders/[id]`
- `/admin/products`, `/admin/products/new`, `/admin/products/[id]/edit`
- `/admin/blog`, `/admin/blog/new`, `/admin/blog/[id]/edit`
- `/admin/cms`, `/admin/cms/[sectionKey]`
- `/admin/settings`
- all current API route handlers
