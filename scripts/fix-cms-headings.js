/**
 * One-time fix: strips the duplicated accent word that was baked into
 * the promise and purity section headings in the initial DB seed.
 *
 * Run: node scripts/fix-cms-headings.js
 */
const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function fix() {
  const r1 = await pool.query(`
    UPDATE cms_sections
    SET    config     = config || '{"heading": "Authorized Partner of"}'::jsonb,
           updated_at = NOW()
    WHERE  section_key = 'promise'
  `);
  console.log(`✓ promise  : ${r1.rowCount} row(s) updated — heading is now "Authorized Partner of"`);

  const r2 = await pool.query(`
    UPDATE cms_sections
    SET    config     = config || '{"heading": "Prakvedaa is the"}'::jsonb,
           updated_at = NOW()
    WHERE  section_key = 'purity'
  `);
  console.log(`✓ purity   : ${r2.rowCount} row(s) updated — heading is now "Prakvedaa is the"`);

  await pool.end();
  console.log("\nDone. Restart / redeploy to pick up the changes (or flush Redis config cache).");
}

fix().catch((err) => {
  console.error(err);
  process.exit(1);
});
