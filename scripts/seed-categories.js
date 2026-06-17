/**
 * seed-categories.js
 * Idempotent seeder: inserts BuyWell product categories if they don't exist yet.
 * Run locally: node scripts/seed-categories.js
 * Run on server: docker exec <container> node /app/seed-categories.js
 * (copy to /app/ first, or run via npm script)
 *
 * Categories mirror: https://phpstack-1109345-6038102.cloudwaysapps.com/categories
 */
'use strict';

const { Pool } = require('pg');
const { randomUUID } = require('crypto');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const CATEGORIES = [
  { name: 'Phone N Gadgets',   slug: 'phone-n-gadgets',  color: '#3B82F6', sort: 1 },
  { name: 'Mens Fashion',      slug: 'mens-fashion',     color: '#8B5CF6', sort: 2 },
  { name: 'Womens Fashion',    slug: 'womens-fashion',   color: '#EC4899', sort: 3 },
  { name: 'Kids Fashion',      slug: 'kids-fashion',     color: '#F59E0B', sort: 4 },
  { name: 'Health N Beauty',   slug: 'health-n-beauty',  color: '#10B981', sort: 5 },
  { name: 'Pet Supplies',      slug: 'pet-supplies',     color: '#F97316', sort: 6 },
  { name: 'Baby n Toddlers',   slug: 'baby-n-toddlers',  color: '#EF4444', sort: 7 },
  { name: 'Sports N Outdoors', slug: 'sports-n-outdoors',color: '#0EA5E9', sort: 8 },
  { name: 'Kitchen Tools',     slug: 'kitchen-tools',    color: '#0d7659', sort: 9 },
];

// Slugs of old irrelevant categories to deactivate (not delete, in case products reference them)
const DEACTIVATE_SLUGS = ['honey', 'ghee', 'a2-ghee', 'a2-bilona-ghee'];

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Deactivate old irrelevant categories
    const deactivateResult = await client.query(
      `UPDATE product_categories SET is_active = false
       WHERE LOWER(slug) = ANY($1::text[])`,
      [DEACTIVATE_SLUGS]
    );
    console.log(`✓ Deactivated ${deactivateResult.rowCount} old categories`);

    // 2. Insert new categories (skip if slug already exists)
    let inserted = 0;
    for (const cat of CATEGORIES) {
      const exists = await client.query(
        'SELECT id FROM product_categories WHERE slug = $1',
        [cat.slug]
      );
      if (exists.rows.length === 0) {
        await client.query(
          `INSERT INTO product_categories (id, name, slug, color, sort_order, is_active, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())`,
          [randomUUID(), cat.name, cat.slug, cat.color, cat.sort]
        );
        console.log(`  + Inserted: ${cat.name}`);
        inserted++;
      } else {
        // Update name/color/sort if it already exists (make it active)
        await client.query(
          `UPDATE product_categories SET name=$2, color=$3, sort_order=$4, is_active=true, updated_at=NOW()
           WHERE slug=$1`,
          [cat.slug, cat.name, cat.color, cat.sort]
        );
        console.log(`  ~ Updated: ${cat.name}`);
      }
    }
    console.log(`✓ ${inserted} categories inserted`);

    // 3. Reassign products from legacy text categories to new categoryId
    //    Map old category string values → new slug
    const REMAP = [
      { oldCategory: 'honey',  newSlug: 'health-n-beauty' },
      { oldCategory: 'ghee',   newSlug: 'health-n-beauty' },
      { oldCategory: 'other',  newSlug: 'health-n-beauty' },
    ];

    for (const { oldCategory, newSlug } of REMAP) {
      const catRow = await client.query(
        'SELECT id FROM product_categories WHERE slug=$1', [newSlug]
      );
      if (!catRow.rows.length) continue;
      const newCatId = catRow.rows[0].id;
      const r = await client.query(
        `UPDATE products SET category_id=$1, updated_at=NOW()
         WHERE category=$2 AND (category_id IS NULL OR category_id='')`,
        [newCatId, oldCategory]
      );
      if (r.rowCount > 0) console.log(`  → Remapped ${r.rowCount} '${oldCategory}' products → ${newSlug}`);
    }

    await client.query('COMMIT');
    console.log('\n✅ Category seed complete');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

run();
