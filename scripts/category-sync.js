'use strict';

const { Pool } = require('pg');
const { randomUUID } = require('crypto');
const { CATEGORIES } = require('./category-data.js');

module.exports = async function syncCategories() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
    idleTimeoutMillis: 10000,
  });

  try {
    // 1. Ensure all columns exist first (self-sufficient regardless of migration state)
    await pool.query(`
      ALTER TABLE product_categories ADD COLUMN IF NOT EXISTS hsn_code text;
      ALTER TABLE product_categories ADD COLUMN IF NOT EXISTS tax_rate_id integer;
      ALTER TABLE product_categories ADD COLUMN IF NOT EXISTS show_on_homepage boolean NOT NULL DEFAULT false;
      ALTER TABLE product_categories ADD COLUMN IF NOT EXISTS show_on_shop boolean NOT NULL DEFAULT true;
      ALTER TABLE product_categories ADD COLUMN IF NOT EXISTS show_on_hero_sidebar boolean NOT NULL DEFAULT false;
      ALTER TABLE product_categories ADD COLUMN IF NOT EXISTS show_on_shop_widget boolean NOT NULL DEFAULT false;
    `);

    // 2. Check if seed is current: food-grocery must exist AND have hero sidebar enabled
    //    If categories exist but lack the new flags, force a re-seed.
    const { rows: [check] } = await pool.query(
      "SELECT id, show_on_hero_sidebar FROM product_categories WHERE slug = 'food-grocery' LIMIT 1"
    );

    if (check && check.show_on_hero_sidebar === true) {
      console.log('[category-sync] Categories already seeded and up to date. Skipping.');
      return;
    }

    console.log('[category-sync] Syncing categories (new flags or first run)...');

    // 3. Wipe existing categories
    await pool.query('DELETE FROM product_categories');

    // 4. Build rate map
    const ratesRes = await pool.query('SELECT id, total_rate FROM tax_rates WHERE is_active = true');
    const rateMap = {};
    for (const row of ratesRes.rows) {
      const pct = Math.round(row.total_rate / 100);
      if (!(pct in rateMap)) rateMap[pct] = row.id;
    }
    for (const row of ratesRes.rows) {
      if (row.total_rate === 0) rateMap[0] = row.id;
      if (row.total_rate === 300) rateMap[3] = row.id;
    }

    let parentInserted = 0, childInserted = 0;

    for (const cat of CATEGORIES) {
      const parentId = randomUUID();
      const taxRateId = rateMap[cat.gstRate ?? -1] ?? null;

      await pool.query(`
        INSERT INTO product_categories
          (id, name, slug, color, description, hsn_code, tax_rate_id,
           show_on_homepage, show_on_shop, show_on_hero_sidebar, show_on_shop_widget,
           sort_order, is_active, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,true,now(),now())
      `, [parentId, cat.name, cat.slug, cat.color, cat.description ?? null,
          cat.hsnCode ?? null, taxRateId,
          cat.showOnHomepage ?? false, cat.showOnShop ?? true,
          cat.showOnHeroSidebar ?? false, cat.showOnShopWidget ?? false,
          cat.sortOrder ?? 0]);

      parentInserted++;

      for (const child of (cat.children ?? [])) {
        const childTaxRateId = rateMap[child.gstRate ?? -1] ?? null;
        await pool.query(`
          INSERT INTO product_categories
            (id, name, slug, parent_id, color, description, hsn_code, tax_rate_id,
             show_on_homepage, show_on_shop, show_on_hero_sidebar, show_on_shop_widget,
             sort_order, is_active, created_at, updated_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,false,true,false,false,$9,true,now(),now())
        `, [randomUUID(), child.name, child.slug, parentId,
            cat.color, null, child.hsnCode ?? null, childTaxRateId,
            child.sortOrder ?? 0]);
        childInserted++;
      }
    }

    console.log(`[category-sync] Successfully synced ${parentInserted} parents and ${childInserted} children.`);

  } finally {
    await pool.end();
  }
};
