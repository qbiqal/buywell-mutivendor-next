// startup.js — runs on every container start (via Dockerfile CMD)
// Order: DB migrations → config seed → Next.js server
//
// DATA-SAFETY GUARANTEE:
//   1. migrate()       — Drizzle tracks applied migrations in __drizzle_migrations.
//                        Only NEW, unapplied SQL files are executed. Existing
//                        migrations are never re-run. Zero data loss on redeploy.
//   2. config-seed.js  — Every INSERT uses ON CONFLICT DO NOTHING.
//                        Admin-configured values are NEVER overwritten.
//
// ⚠️  DO NOT add npm run db:seed here. That script is a one-time local-only
//      bootstrap and will truncate/duplicate production data if run on deploy.
'use strict';

const path = require('path');

async function main() {
  console.log('[startup] APRAS Naturals starting...');

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

  // ── 3. Start Next.js standalone server ────────────────────────────────────
  console.log('[startup] Starting Next.js server on port', process.env.PORT || 3000);
  require('./server.js');
}

main().catch((err) => {
  console.error('[startup] Fatal error:', err);
  process.exit(1);
});
