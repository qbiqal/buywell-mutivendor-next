# Deploying a Full-Stack Next.js App on Qbiqal Infrastructure
## Complete Step-by-Step Guide with CI/CD via GitHub Actions + Coolify

> Applies to any Next.js app with PostgreSQL + Redis on the Qbiqal Hetzner cluster.
> Written from the APRAS Naturals deployment (2026-06-01). Follow this exactly next time.

---

## Universal Credentials (use these for EVERY new app — never change)

### Coolify

| Item | Value |
|---|---|
| Coolify dashboard | `http://178.104.149.128:8000` |
| Coolify login | `qbiqal.official@gmail.com` / `Abcd_1234@` |
| App server UUID | `p5zh8gtblt2wy4g747bvlhyu` (qbiqal-apps) |
| Client Projects UUID | `x6t42bpwzaxjwn3pmzokvuiy` |
| Personal Projects UUID | `ijmlynb275zich1olbk3uj6n` |
| GitHub App UUID | `hmqdx11tborokgdudn2a5zql` (qbiqal-hetzner) |

### GitHub Actions Secrets

**2 universal secrets** — copy-paste same values into every new repo:

| Secret | Value |
|---|---|
| `COOLIFY_TOKEN` | `25|pM6PTqSOYIxGUJXvO0MTB7GbPLgsWHk9fMQ3ItMe4fb8b6ec` |
| `COOLIFY_BASE_URL` | `http://178.104.149.128:8000` |

**2 per-app secrets** — unique per repo:

| Secret | Notes |
|---|---|
| `COOLIFY_APP_UUID` | The UUID from Coolify when you create the resource (Step 3.2) |
| `DEPLOY_SECRET` | Random string — must match the `DEPLOY_SECRET` env var set in Coolify |

> **GitHub App access**: `qbiqal-hetzner` is installed with **All repositories** access. Every new repo you push to GitHub is automatically accessible to Coolify — no per-repo configuration step needed.

### Cloudflare R2 (shared across apps — each app gets its own bucket)

| Item | Value |
|---|---|
| Cloudflare login | `qbiqal.official@gmail.com` via Google login |
| Cloudflare Account ID | `cda9aed67cb854ed4375d1faea9c77da` |
| R2 S3 endpoint | `https://cda9aed67cb854ed4375d1faea9c77da.r2.cloudflarestorage.com` |
| R2 dashboard | `https://dash.cloudflare.com/cda9aed67cb854ed4375d1faea9c77da/r2` |

---

## Infrastructure Map

| Server | Private IP | Public IP | Role |
|---|---|---|---|
| qbiqal-coolify | 10.0.0.2 | 178.104.149.128 | Coolify control plane (port 8000) |
| qbiqal-redis | 10.0.0.3 | 178.104.158.112 | Shared Redis (no password, port 6379) |
| Qbiqal-app-server | 10.0.0.4 | 178.104.105.31 | App containers run here |
| qbiqal-postgres | 10.0.0.5 | 178.104.158.232 | Shared PostgreSQL 17 (port 5432) |

SSH access: `ssh -i ~/.ssh/qbiqal_hetzner root@<public-ip>`

---

## Phase 1 — Prepare the Project

### 1.1 Dockerfile (Critical Rules)

```dockerfile
# ── Stage 1: base ────────────────────────────────────────────────────────────
FROM node:24-alpine AS base
RUN apk add --no-cache libc6-compat

# ── Stage 2: deps ────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ── Stage 3: builder ─────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

ARG NEXT_PUBLIC_APP_URL=https://yourapp.com
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=3072"

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# db:generate does NOT need a real DB (reads schema.ts only)
RUN npm run db:generate 2>/dev/null || true

RUN npm run build

# ── Stage 4: runner ───────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--no-deprecation"

RUN apk add --no-cache curl
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/src/lib/db/migrations ./src/lib/db/migrations

# drizzle-orm and pg are not traced by nft — copy explicitly
COPY --from=deps /app/node_modules/drizzle-orm ./node_modules/drizzle-orm
COPY --from=deps /app/node_modules/pg ./node_modules/pg
COPY --from=deps /app/node_modules/pg-pool ./node_modules/pg-pool
COPY --from=deps /app/node_modules/pg-protocol ./node_modules/pg-protocol
COPY --from=deps /app/node_modules/pg-types ./node_modules/pg-types
COPY --from=deps /app/node_modules/pgpass ./node_modules/pgpass

COPY --chown=nextjs:nodejs scripts/startup.js ./startup.js
COPY --chown=nextjs:nodejs scripts/config-seed.js ./config-seed.js

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=15s --timeout=5s --start-period=60s --retries=5 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node", "startup.js"]
```

**⚠️ Critical Dockerfile rules:**
- Do NOT set `ENV DATABASE_URL=...` in the builder stage (Coolify injects them at runtime only)
- Do NOT add `ENV NODE_ENV=production` in the builder stage (npm install skips devDependencies)
- `output: "standalone"` must be set in `next.config.ts`

### 1.2 Root Layout — force-dynamic (MANDATORY)

Every full-stack Next.js app that queries the DB in the root layout **MUST** have this:

```typescript
// src/app/layout.tsx
export const dynamic = "force-dynamic";   // ← ADD THIS LINE
```

**Why**: Next.js tries to statically pre-render `/_not-found` and other shell pages at build time. If the root layout queries the DB (`getModuleState`, session checks, etc.), the build fails with `ECONNREFUSED` because no DB exists in the build container. `force-dynamic` prevents all static pre-rendering.

Also add to any page that queries DB directly:
```typescript
// src/app/some-page/page.tsx
export const dynamic = "force-dynamic";
```

### 1.3 Health Check Endpoint (required for Coolify)

```typescript
// src/app/api/health/route.ts
export async function GET() {
  // Ping DB and Redis
  return NextResponse.json({ success: true, status: { app: "ok", db: "ok", redis: "ok" } });
}
```

### 1.4 Deploy Hook (cache flush on deploy)

```typescript
// src/app/api/deploy-hook/route.ts
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-deploy-secret");
  if (secret !== process.env.DEPLOY_SECRET) return unauthorized();
  // flush Redis query:* and page:* keys
}
```

### 1.5 docker-compose.yml (for local dev only — Coolify uses Dockerfile directly)

```yaml
services:
  app:
    build: .
    ports: ["3000:3000"]
    environment:
      DATABASE_URL: ${DATABASE_URL}
      REDIS_URL: ${REDIS_URL}
      # ... other vars
```

**Note**: In production, Coolify uses `build_pack: dockerfile`, NOT `dockercompose`. The `docker-compose.yml` is only for local development.

### 1.6 GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: CI/CD — Your App Name

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    name: Type-check
    runs-on: ubuntu-latest
    env:
      FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: 'npm'
      - run: npm ci
      - run: npm run typecheck   # add: "typecheck": "node node_modules/typescript/bin/tsc --noEmit"

  deploy:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    env:
      FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true
    steps:
      - name: Trigger Coolify Deploy
        run: |
          HTTP_STATUS=$(curl -s -o /tmp/resp.txt -w "%{http_code}" -X POST \
            "${{ secrets.COOLIFY_BASE_URL }}/api/v1/deploy?uuid=${{ secrets.COOLIFY_APP_UUID }}&force=false" \
            -H "Authorization: Bearer ${{ secrets.COOLIFY_TOKEN }}" \
            -H "Content-Type: application/json")
          cat /tmp/resp.txt
          [ "$HTTP_STATUS" -ge 200 ] && [ "$HTTP_STATUS" -le 299 ] || exit 1

      - name: Wait for Healthy
        run: |
          for i in $(seq 1 24); do
            echo "Attempt $i/24..."
            if curl -sf --max-time 10 "https://yourapp.com/api/health" | grep -q '"success":true'; then
              echo "✅ Healthy"; exit 0
            fi
            sleep 15
          done
          exit 1

      - name: Flush Cache
        run: |
          curl -sf -X POST "https://yourapp.com/api/deploy-hook" \
            -H "x-deploy-secret: ${{ secrets.DEPLOY_SECRET }}" \
            -H "Content-Type: application/json"
```

---

## Phase 2 — Create the PostgreSQL Database

SSH into the Postgres server **as postgres system user** (not root):

```bash
ssh -i ~/.ssh/qbiqal_hetzner root@178.104.158.232

# Create user and database
su - postgres -c "psql -c \"CREATE USER yourapp_user WITH PASSWORD 'strong-random-password';\""
su - postgres -c "psql -c \"CREATE DATABASE yourapp_db OWNER yourapp_user;\""
su - postgres -c "psql -c \"GRANT ALL PRIVILEGES ON DATABASE yourapp_db TO yourapp_user;\""

# Allow the app server (10.0.0.4) to connect
echo "host    yourapp_db  yourapp_user  10.0.0.4/32  scram-sha-256" >> /etc/postgresql/17/main/pg_hba.conf
systemctl reload postgresql

# Test from postgres server itself
PGPASSWORD='strong-random-password' psql -h 127.0.0.1 -U yourapp_user -d yourapp_db -c 'SELECT 1;'
```

Then test from the app server to confirm private network routing:
```bash
ssh -i ~/.ssh/qbiqal_hetzner root@178.104.105.31
PGPASSWORD='strong-random-password' psql -h 10.0.0.5 -U yourapp_user -d yourapp_db -c 'SELECT current_database();'
```

**DATABASE_URL** for Coolify env vars:
```
postgresql://yourapp_user:strong-random-password@10.0.0.5:5432/yourapp_db
```

**REDIS_URL** (shared, no password):
```
redis://10.0.0.3:6379/0
```

---

## Phase 3 — Create App in Coolify

### 3.1 Log into Coolify

Open: `http://178.104.149.128:8000`
Login: `qbiqal.official@gmail.com` / `Abcd_1234@`

### 3.2 Create the Resource via API (faster than UI)

```bash
COOLIFY_TOKEN="<root-token>"    # from Security → API Tokens
COOLIFY_URL="http://178.104.149.128:8000"

# Create the app
RESP=$(curl -s -X POST "$COOLIFY_URL/api/v1/applications/private-github-app" \
  -H "Authorization: Bearer $COOLIFY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "project_uuid": "x6t42bpwzaxjwn3pmzokvuiy",
    "environment_name": "production",
    "server_uuid": "p5zh8gtblt2wy4g747bvlhyu",
    "github_app_uuid": "hmqdx11tborokgdudn2a5zql",
    "git_repository": "qbiqal/your-repo",
    "git_branch": "main",
    "build_pack": "dockerfile",
    "name": "your-app-name",
    "ports_exposes": "3000",
    "health_check_enabled": true,
    "health_check_path": "/api/health"
  }')
APP_UUID=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['uuid'])")
echo "App UUID: $APP_UUID"
```

**Key IDs (pre-filled for Qbiqal infrastructure):**
- `project_uuid` for Client Projects: `x6t42bpwzaxjwn3pmzokvuiy`
- `project_uuid` for Personal Projects: `ijmlynb275zich1olbk3uj6n`
- `server_uuid` (qbiqal-apps): `p5zh8gtblt2wy4g747bvlhyu`
- `github_app_uuid` (qbiqal-hetzner): `hmqdx11tborokgdudn2a5zql`

### 3.3 Set Domain

```bash
curl -s -X PATCH "$COOLIFY_URL/api/v1/applications/$APP_UUID" \
  -H "Authorization: Bearer $COOLIFY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"domains": "https://yourapp.com"}'
```

### 3.4 Set Environment Variables

```bash
set_env() {
  curl -s -X POST "$COOLIFY_URL/api/v1/applications/$APP_UUID/envs" \
    -H "Authorization: Bearer $COOLIFY_TOKEN" \
    -H "Content-Type: application/json" \
    --data-raw "{\"key\": \"$1\", \"value\": \"$2\", \"is_preview\": false}"
}

set_env "DATABASE_URL"       "postgresql://yourapp_user:password@10.0.0.5:5432/yourapp_db"
set_env "REDIS_URL"          "redis://10.0.0.3:6379/0"
set_env "JWT_SECRET"         "$(openssl rand -base64 48 | tr -d '/+=' | head -c 64)"
set_env "ENCRYPTION_KEY"     "$(openssl rand -base64 32 | tr -d '/+=' | head -c 32)"
set_env "DEPLOY_SECRET"      "$(openssl rand -base64 32 | tr -d '/+=' | head -c 32)"
set_env "NEXT_PUBLIC_APP_URL" "https://yourapp.com"
```

> **Do NOT set `NODE_ENV`** — the Dockerfile sets it in the runner stage already.
> Setting it in Coolify causes npm to skip devDependencies at build time → build fails.

### 3.5 Create a Deploy-Only API Token for GitHub Actions

Go to **Security → API Tokens** in Coolify UI:
1. Enter name: `yourapp-github-actions`
2. Check **deploy** permission only
3. Set expiry: **Never**
4. Click **Create** → copy the token immediately (shown only once)

The deploy webhook URL:
```
http://178.104.149.128:8000/api/v1/deploy?uuid=<APP_UUID>&force=false
```

---

## Phase 4 — Set GitHub Actions Secrets

Go to: `https://github.com/qbiqal/<repo>/settings/secrets/actions`

Set these **4 secrets** — 2 are the same value every time, 2 are app-specific:

| Secret | Value | Same for all apps? |
|---|---|---|
| `COOLIFY_TOKEN` | `25|pM6PTqSOYIxGUJXvO0MTB7GbPLgsWHk9fMQ3ItMe4fb8b6ec` | ✅ Yes — copy/paste every time |
| `COOLIFY_BASE_URL` | `http://178.104.149.128:8000` | ✅ Yes — copy/paste every time |
| `COOLIFY_APP_UUID` | The UUID from Step 3.2 (e.g. `gs856v98p5925c8nzcey68f3`) | ⚡ Different per app |
| `DEPLOY_SECRET` | Random string — same as what you put in Coolify env vars | ⚡ Different per app |

> **GitHub App access**: The `qbiqal-hetzner` app is already configured for **all repositories** in your account. You do NOT need to grant access per-repo. It works automatically for every new repo you push to GitHub.

---

## Phase 4b — Cloudflare R2 Storage Setup (for file uploads)

Every app that accepts file uploads (payment proofs, product images, media library) needs its own R2 bucket. Cloudflare R2 account is `cda9aed67cb854ed4375d1faea9c77da`.

### Programmatic method (LLM does this — preferred)

```bash
# 1. Log into Cloudflare via browser (Google login: qbiqal.official@gmail.com)
# Navigate to: https://dash.cloudflare.com/cda9aed67cb854ed4375d1faea9c77da/r2

# 2. Create bucket via Cloudflare API (needs existing CF API token)
CF_API_TOKEN="<existing token from Security > API Tokens>"
ACCOUNT_ID="cda9aed67cb854ed4375d1faea9c77da"
BUCKET="yourapp-media"

curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/r2/buckets" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"$BUCKET\", \"location_hint\": \"apac\"}" | python3 -m json.tool

# 3. Enable public development URL (browser only — no API for this)
# Dashboard: https://dash.cloudflare.com/$ACCOUNT_ID/r2/default/buckets/$BUCKET/settings
# → Public Development URL → Enable → type "allow" → Allow

# 4. Create R2 API token (Object Read & Write, specific bucket)
# Dashboard: https://dash.cloudflare.com/$ACCOUNT_ID/r2/api-tokens
# → Create Account API token → name: yourapp-media
# → Permissions: Object Read & Write
# → Specify bucket(s): yourapp-media
# → TTL: Forever → Create
# SAVE: Access Key ID and Secret Access Key (shown only once)
```

### Manual method (human in browser)

1. Go to `https://dash.cloudflare.com` → sign in with Google (`qbiqal.official@gmail.com`)
2. Left nav → **R2 Object Storage** → **Create bucket**
3. Name: `yourapp-media` → Location: Automatic → Create
4. Go to bucket **Settings** → **Public Development URL** → **Enable** → type `allow` → Allow
5. Go to **R2 → API Tokens** → **Create Account API token**
   - Token name: `yourapp-media`
   - Permission: **Object Read & Write**
   - Buckets: **Apply to specific buckets only** → select `yourapp-media`
   - TTL: **Forever**
   - Click **Create Account API Token**
   - **Copy and save Access Key ID and Secret Access Key** (shown only once!)

### Set R2 credentials in Coolify env vars

After creating the token, add these 5 env vars to the Coolify app (API or UI):

```bash
CLOUDFLARE_ACCOUNT_ID       = cda9aed67cb854ed4375d1faea9c77da
CLOUDFLARE_R2_BUCKET_NAME   = yourapp-media
CLOUDFLARE_R2_ACCESS_KEY_ID = <Access Key ID from step above>
CLOUDFLARE_R2_SECRET_ACCESS_KEY = <Secret Access Key from step above>
CLOUDFLARE_R2_PUBLIC_URL    = https://pub-<hash>.r2.dev   # from settings page
```

```bash
# Programmatic via Coolify API:
APP_UUID="<your-app-uuid>"
COOLIFY_TOKEN="25|pM6PTqSOYIxGUJXvO0MTB7GbPLgsWHk9fMQ3ItMe4fb8b6ec"

for KV in \
  "CLOUDFLARE_ACCOUNT_ID=cda9aed67cb854ed4375d1faea9c77da" \
  "CLOUDFLARE_R2_BUCKET_NAME=yourapp-media" \
  "CLOUDFLARE_R2_ACCESS_KEY_ID=<key-id>" \
  "CLOUDFLARE_R2_SECRET_ACCESS_KEY=<secret>" \
  "CLOUDFLARE_R2_PUBLIC_URL=https://pub-xxx.r2.dev"; do
  K="${KV%%=*}"; V="${KV#*=}"
  curl -s -X POST "http://178.104.149.128:8000/api/v1/applications/$APP_UUID/envs" \
    -H "Authorization: Bearer $COOLIFY_TOKEN" \
    -H "Content-Type: application/json" \
    --data-raw "{\"key\": \"$K\", \"value\": \"$V\", \"is_preview\": false}"
done
```

### APRAS Naturals R2 reference values

| Item | Value |
|---|---|
| Bucket name | `apras-naturals-media` |
| Public URL | `https://media.aprasnaturals.com` (custom domain, production-ready) |
| r2.dev fallback URL | `https://pub-247bd7bddc43440aa2f82b3bfe2d9b20.r2.dev` |
| Access Key ID | `d31f2ac430e557f84c59022958bf1aa4` |
| Secret (in Coolify) | set as `CLOUDFLARE_R2_SECRET_ACCESS_KEY` |
| `CLOUDFLARE_R2_PUBLIC_URL` in Coolify | `https://media.aprasnaturals.com` |

---

## Phase 5 — First Deploy

### 5.1 Trigger from Coolify

```bash
RESP=$(curl -s -X POST "$COOLIFY_URL/api/v1/deploy?uuid=$APP_UUID&force=true" \
  -H "Authorization: Bearer $COOLIFY_TOKEN")
echo "$RESP"
```

Monitor at: `http://178.104.149.128:8000/project/.../application/$APP_UUID/deployment/<deploy-uuid>`

### 5.2 What startup.js Does Automatically on Each Deploy

The `scripts/startup.js` runs before Next.js starts:
1. **Drizzle migrations** — applies any pending SQL migrations from `src/lib/db/migrations/`
2. **Config seed** — inserts default `site_config` rows with `ON CONFLICT DO NOTHING`
3. **Starts Next.js** server

### 5.3 Run the Full Data Seed (First Deploy Only)

After the first successful deploy, run the seed via SSH tunnel to reach the Postgres internal IP:

```bash
# Open SSH tunnel: local:5434 → app server → postgres internal IP
ssh -i ~/.ssh/qbiqal_hetzner -L 5434:10.0.0.5:5432 -N root@178.104.105.31 &
sleep 3

# Run seed
DATABASE_URL="postgresql://yourapp_user:password@127.0.0.1:5434/yourapp_db" \
  npm run db:seed

# Run indexes
DATABASE_URL="postgresql://yourapp_user:password@127.0.0.1:5434/yourapp_db" \
  npm run db:indexes

# Close tunnel
kill $(lsof -ti:5434) 2>/dev/null
```

### 5.4 Flush Redis Cache After First Seed

If you tested the API before seeding, stale empty results get cached. Flush from the Redis server:

```bash
ssh -i ~/.ssh/qbiqal_hetzner root@178.104.158.112 \
  "redis-cli KEYS 'an:query:*' | xargs -r redis-cli DEL"
```

---

## Phase 6 — Verify Production

```bash
# Health (should show app:ok, db:ok, redis:ok)
curl -sf https://yourapp.com/api/health | python3 -m json.tool

# Products (or your main data endpoint)
curl -sf https://yourapp.com/api/products | python3 -c "import sys,json; d=json.load(sys.stdin); print('Items:', len(d.get('data',[])))"

# Admin login
curl -sf -X POST https://yourapp.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@yourapp.com","password":"admin123"}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('Login:', 'OK' if d.get('success') else 'FAIL')"
```

**⚠️ Change the seed admin password immediately after first login!**

---

## Phase 7 — CI/CD Flow (Every Push After Setup)

Once secrets are set, every `git push origin main`:

1. GitHub Actions triggers the `test` job → runs `npm run typecheck`
2. If tests pass → triggers the `deploy` job
3. Deploy job POSTs to Coolify webhook → Coolify queues a new Docker build
4. Coolify pulls latest code from GitHub → builds Docker image
5. Container starts → `startup.js` runs migrations + config seed
6. Health check passes → Coolify marks deployment as successful
7. GitHub Actions polls `/api/health` until healthy (up to 6 minutes)
8. GitHub Actions calls `/api/deploy-hook` to flush Redis query cache
9. ✅ Done — new code is live

---

## Common Errors & Fixes

### Build fails with `ECONNREFUSED` during `next build`
**Cause**: Root layout or page queries DB at build time (Next.js static pre-rendering).
**Fix**: Add `export const dynamic = "force-dynamic"` to `src/app/layout.tsx`.

### Build fails with `npm run build` exit 1 and `NODE_ENV=production` warning
**Cause**: `NODE_ENV=production` set as Coolify env var → npm skips devDependencies → build tools missing.
**Fix**: Delete `NODE_ENV` from Coolify env vars. The Dockerfile runner stage sets it correctly.

### App deployed but data returns empty
**Cause**: Redis cached empty result before seed ran.
**Fix**: Flush Redis: `redis-cli KEYS 'an:query:*' | xargs -r redis-cli DEL` on the Redis server.

### Coolify build uses `dockercompose` instead of `dockerfile`
**Cause**: Wrong build pack selected (dockercompose injects all env vars as build ARGs).
**Fix**: Set `build_pack: dockerfile` via API:
```bash
curl -X PATCH ".../api/v1/applications/$UUID" -d '{"build_pack": "dockerfile", "dockerfile_location": "/Dockerfile"}'
```

### Postgres connection refused from app server
**Cause**: `pg_hba.conf` missing entry for the new user/IP.
**Fix**: Add line and reload: `echo "host yourdb youruser 10.0.0.4/32 scram-sha-256" >> /etc/postgresql/17/main/pg_hba.conf && systemctl reload postgresql`

### GitHub App can't find the repo
**Cause**: `qbiqal-hetzner` GitHub App not granted access to the new repo.
**Fix**: `https://github.com/settings/installations` → qbiqal-hetzner → Configure → add repo.

---

## APRAS Naturals Specific Values (Reference)

| Item | Value |
|---|---|
| App UUID | `gs856v98p5925c8nzcey68f3` |
| Domain | `https://aprasnaturals.com` |
| DB | `apras_naturals_db` / user: `apras_user` |
| DB internal URL | `postgresql://apras_user:...@10.0.0.5:5432/apras_naturals_db` |
| Redis URL | `redis://10.0.0.3:6379/0` |
| Admin email | `admin@aprasnaturals.com` |
| Deploy webhook | `http://178.104.149.128:8000/api/v1/deploy?uuid=gs856v98p5925c8nzcey68f3&force=false` |
| Coolify project | Qbiqal Client Projects → production environment |
| Coolify log | `http://178.104.149.128:8000/project/x6t42bpwzaxjwn3pmzokvuiy/environment/vjaz1j6oe1988kfcjemr8n2z/application/gs856v98p5925c8nzcey68f3` |


Next step for production: In the R2 bucket settings → Custom Domains → point
  ▎ media.aprasnaturals.com to remove the r2.dev rate-limit. Then update 
  ▎ CLOUDFLARE_R2_PUBLIC_URL in Coolify to the custom domain