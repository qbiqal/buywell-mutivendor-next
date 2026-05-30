# ── Stage 1: base ──────────────────────────────────────────────────────────────
FROM node:24-alpine AS base
RUN apk add --no-cache libc6-compat

# ── Stage 2: deps ──────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ── Stage 3: builder ───────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

ARG NEXT_PUBLIC_APP_URL=https://aprasnaturals.com
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_TELEMETRY_DISABLED=1
# 3GB covers large TS codebases on constrained build servers
ENV NODE_OPTIONS="--max-old-space-size=3072"

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate any pending Drizzle migrations from schema.ts (no real DB needed)
RUN DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder \
    npm run db:generate 2>/dev/null || true

RUN npm run build

# ── Stage 4: runner ────────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--no-deprecation"

RUN apk add --no-cache curl

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Next.js standalone output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Drizzle migration SQL files — startup.js applies pending ones before serving
COPY --from=builder --chown=nextjs:nodejs /app/src/lib/db/migrations ./src/lib/db/migrations

# drizzle-orm + pg are NOT traced by Next.js nft standalone — copy explicitly
COPY --from=deps /app/node_modules/drizzle-orm ./node_modules/drizzle-orm
COPY --from=deps /app/node_modules/pg ./node_modules/pg
COPY --from=deps /app/node_modules/pg-pool ./node_modules/pg-pool
COPY --from=deps /app/node_modules/pg-protocol ./node_modules/pg-protocol
COPY --from=deps /app/node_modules/pg-types ./node_modules/pg-types
COPY --from=deps /app/node_modules/pgpass ./node_modules/pgpass

# Startup scripts
COPY --chown=nextjs:nodejs scripts/startup.js ./startup.js
COPY --chown=nextjs:nodejs scripts/config-seed.js ./config-seed.js

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=15s --timeout=5s --start-period=60s --retries=5 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node", "startup.js"]
