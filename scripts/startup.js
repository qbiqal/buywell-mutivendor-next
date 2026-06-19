// startup.js — runs on every container start (via Dockerfile CMD)
// Order: DB migrations -> config seed -> content seed -> Next.js server
//
// DATA-SAFETY GUARANTEE:
//   1. migrate()       — Drizzle tracks applied migrations in __drizzle_migrations.
//                        Only NEW, unapplied SQL files are executed. Existing
//                        migrations are never re-run. Zero data loss on redeploy.
//   2. config-seed.js  — Every INSERT uses ON CONFLICT DO NOTHING.
//                        Admin-configured values are NEVER overwritten.
//   3. content-seed.js — Inserts only missing CMS policy pages, compliance
//                        checklist rows, and default menu links. Existing
//                        products, users, orders, settings, and edited content
//                        are not recreated or truncated.
//
// ⚠️  DO NOT add npm run db:seed here. That script is a one-time local-only
//      bootstrap and will truncate/duplicate production data if run on deploy.
'use strict';

const path = require('path');

async function main() {
  console.log('[startup] BuyWell Marketplace starting...');

  if (!process.env.DATABASE_URL) {
    console.error('[startup] ERROR: DATABASE_URL is not set. Exiting.');
    process.exit(1);
  }

  // ── 1. Run DB migrations ──────────────────────────────────────────────────
  console.log('[startup] Running DB migrations...');
  try {
    const { drizzle } = require('drizzle-orm/node-postgres');
    const { migrate } = require('drizzle-orm/node-postgres/migrator');
    const { Pool } = require('pg');

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 1,
      idleTimeoutMillis: 10000,
    });

    const db = drizzle(pool);
    await migrate(db, {
      migrationsFolder: path.join(__dirname, 'src/lib/db/migrations'),
    });
    await pool.end();
    console.log('[startup] Migrations complete.');
  } catch (err) {
    // Non-fatal: migrations may already be applied or DB may be unreachable temporarily
    console.error('[startup] Migration warning:', err.message);
  }

  // ── 2. Seed default config values (idempotent) ────────────────────────────
  console.log('[startup] Seeding config defaults...');
  try {
    await require('./config-seed.js')();
    console.log('[startup] Config seed complete.');
  } catch (err) {
    console.error('[startup] Config seed warning:', err.message);
  }

  // ── 3. Seed production-safe CMS defaults (idempotent) ─────────────────────
  console.log('[startup] Seeding CMS content defaults...');
  try {
    await require('./content-seed.js')();
    console.log('[startup] CMS content seed complete.');
  } catch (err) {
    console.error('[startup] CMS content seed warning:', err.message);
  }

  // ── 4. Seed Indian GST rates and HSN codes (idempotent) ───────────────────
  console.log('[startup] Seeding GST tax rates and HSN codes...');
  try {
    const { execSync } = require('child_process');
    execSync('node ' + path.join(__dirname, 'gst-seed.js'), { stdio: 'inherit', env: process.env });
    console.log('[startup] GST seed complete.');
  } catch (err) {
    console.error('[startup] GST seed warning:', err.message);
  }

  // ── 5. Seed curated Indian e-commerce category tree (idempotent) ──────────
  console.log('[startup] Seeding product category tree...');
  try {
    await require('./category-seed.js')();
    console.log('[startup] Category seed complete.');
  } catch (err) {
    console.error('[startup] Category seed warning:', err.message);
  }

  // ── 6. Start Next.js standalone server ────────────────────────────────────
  console.log('[startup] Starting Next.js server on port', process.env.PORT || 3000);
  require('./server.js');
}

main().catch((err) => {
  console.error('[startup] Fatal error:', err);
  process.exit(1);
});
