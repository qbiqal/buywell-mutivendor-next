/**
 * BuyWell Multivendor — Product Import Script
 *
 * Imports categories and products from the legacy platform dump.
 * All products are marked as admin-uploaded (no vendor_id).
 *
 * Images: products are created without images by default.
 *   Set SOURCE_SITE_URL=https://oldsite.com to auto-download thumbnails.
 *   Images are stored in the product_images table using the URL pattern:
 *     {SOURCE_SITE_URL}/storage/app/public/product/{filename}
 *
 * Usage:
 *   set -a; source .env.local; set +a
 *   npx tsx scripts/import-products.ts
 *   # or with image downloads:
 *   SOURCE_SITE_URL=https://oldsite.com npx tsx scripts/import-products.ts
 *
 * Safe to re-run: uses ON CONFLICT DO NOTHING for categories and products.
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq } from 'drizzle-orm';
import {
  productCategories,
  products,
  productVariants,
  productImages,
} from '../src/lib/db/schema';
import crypto from 'crypto';

// ─── Data extracted from the legacy MySQL dump ────────────────────────────────

const CATEGORIES = [
  { oldId: '2',  name: 'Mens Fashion',     slug: 'mens-fashion',      color: '#6366F1', sortOrder: 1 },
  { oldId: '3',  name: 'Womens Fashion',   slug: 'womens-fashion',    color: '#EC4899', sortOrder: 2 },
  { oldId: '4',  name: 'Kids Fashion',     slug: 'kids-fashion',      color: '#F59E0B', sortOrder: 3 },
  { oldId: '5',  name: 'Health N Beauty',  slug: 'health-n-beauty',   color: '#10B981', sortOrder: 4 },
  { oldId: '6',  name: 'Pet Supplies',     slug: 'pet-supplies',      color: '#8B5CF6', sortOrder: 5 },
  { oldId: '7',  name: 'Phone N Gadgets',  slug: 'phone-n-gadgets',   color: '#3B82F6', sortOrder: 6 },
  { oldId: '8',  name: 'Baby N Toddlers',  slug: 'baby-n-toddlers',   color: '#F97316', sortOrder: 7 },
  { oldId: '9',  name: 'Sports N Outdoors','slug': 'sports-n-outdoors', color: '#22C55E', sortOrder: 8 },
  { oldId: '10', name: 'Kitchen Tools',    slug: 'kitchen-tools',     color: '#EF4444', sortOrder: 9 },
];

// Prices in rupees (converted to paise ×100 in insert)
const PRODUCTS: Array<{
  oldId: string; name: string; slug: string; catOldId: string;
  priceInr: number; stock: number; details: string; metaTitle?: string; metaDesc?: string;
  thumbnail?: string;
}> = [
  { oldId:'1',  name:'HP Smart Watch',                    slug:'hp-smart-watch',           catOldId:'7',  priceInr:7500, stock:3,  details:'HP Smart Watch',                        thumbnail:'2025-11-19-691d4d396db76.webp' },
  { oldId:'2',  name:'New HP Smart Watch',                slug:'new-hp-smart-watch',        catOldId:'7',  priceInr:7000, stock:100,details:'HP Smart Watch',                        thumbnail:'2025-11-19-691d4da193628.webp' },
  { oldId:'3',  name:'Test Product 1',                    slug:'test-product-1',            catOldId:'2',  priceInr:3000, stock:1,  details:'Test Product Description',              thumbnail:'2026-01-01-695645e43c0fb.webp' },
  { oldId:'4',  name:'Tharunyamrutha',                    slug:'tharunyamrutha',            catOldId:'5',  priceInr:500,  stock:10, details:'Healthy Products',                       thumbnail:'2026-01-09-6960ab8d89394.webp' },
  { oldId:'5',  name:'Cotton Shirts',                     slug:'cotton-shirts',             catOldId:'2',  priceInr:800,  stock:19, details:'Premium 100% Pure Cotton',              thumbnail:'2026-01-18-696cb4b738d44.webp' },
  { oldId:'8',  name:'Aswagandha Rasayanam',              slug:'aswagandha-rasayanam',      catOldId:'5',  priceInr:400,  stock:20, details:'Aswagandha Rasayanam - Herbal Supplement' },
  { oldId:'9',  name:'Chemparathy Thaali Powder',         slug:'chemparathy-thaali-powder', catOldId:'5',  priceInr:120,  stock:50, details:'Traditional Chemparathy Thaali Powder' },
  { oldId:'10', name:'Protein Powder Plus',               slug:'protein-powder-plus',       catOldId:'5',  priceInr:900,  stock:30, details:'Protein Powder Plus - Nutritional Supplement' },
  { oldId:'11', name:'Set Saree',                         slug:'set-saree',                 catOldId:'3',  priceInr:690,  stock:15, details:'Traditional Set Saree' },
  { oldId:'12', name:'Nighties',                          slug:'nighties',                  catOldId:'3',  priceInr:250,  stock:100,details:'Comfortable Nighties' },
  { oldId:'13', name:'BioBerry Antioxidant Health Drink', slug:'bioberry-antioxidant-drink',catOldId:'5',  priceInr:2400, stock:10, details:'BioBerry Antioxidant Health Drink' },
  { oldId:'14', name:'Pathimugham',                       slug:'pathimugham',               catOldId:'5',  priceInr:100,  stock:100,details:'Pathimugham - Traditional Herbal Tea' },
  { oldId:'15', name:'Kasthuri Manjal',                   slug:'kasthuri-manjal',           catOldId:'5',  priceInr:120,  stock:50, details:'Kasthuri Manjal - Wild Turmeric' },
  { oldId:'16', name:'Vitae Oxy Dandruff Oil',            slug:'vitae-oxy-dandruff-oil',    catOldId:'5',  priceInr:240,  stock:20, details:'Vitae Oxy Dandruff Oil - Hair Care' },
  { oldId:'17', name:'Quitter Mosquito Repellent',        slug:'quitter-mosquito-repellent',catOldId:'5',  priceInr:100,  stock:50, details:'Natural Mosquito Repellent Solution' },
  { oldId:'18', name:'Maharshi H15 Hair Care Oil',        slug:'maharshi-h15-hair-oil',     catOldId:'5',  priceInr:199,  stock:50, details:'Maharshi H15 Hair Care Oil' },
  { oldId:'19', name:'Maharshi H15 Hair Shampoo',         slug:'maharshi-h15-shampoo',      catOldId:'5',  priceInr:210,  stock:50, details:'Maharshi H15 Hair Care Shampoo' },
  { oldId:'20', name:'Maharshi Painex Pain Oil',          slug:'maharshi-painex-pain-oil',  catOldId:'5',  priceInr:350,  stock:30, details:'Maharshi Painex Pain Relief Oil' },
  { oldId:'21', name:'Herb O Fresh Massage Oil',          slug:'herb-o-fresh-massage-oil',  catOldId:'5',  priceInr:460,  stock:20, details:'Herb O Fresh Massage Oil' },
  { oldId:'22', name:'Maharshi Noni Capsules Plus',       slug:'maharshi-noni-capsules',    catOldId:'5',  priceInr:380,  stock:30, details:'Maharshi Noni Capsules Plus - Health Supplement' },
  { oldId:'23', name:'Vitae Oxy Pain Spray',              slug:'vitae-oxy-pain-spray',      catOldId:'5',  priceInr:299,  stock:20, details:'Vitae Oxy Pain Relief Spray' },
  { oldId:'24', name:'Thriphala Capsules Nutraceutical',  slug:'thriphala-capsules-nutra',  catOldId:'5',  priceInr:1100, stock:20, details:'Thriphala Capsules - Nutraceutical Product' },
  { oldId:'25', name:'C-Care Capsules',                   slug:'c-care-capsules',           catOldId:'5',  priceInr:900,  stock:25, details:'C-Care Capsules - Health Supplement' },
  { oldId:'26', name:'Green Tea Capsules Nutraceutical',  slug:'green-tea-capsules-nutra',  catOldId:'5',  priceInr:800,  stock:25, details:'Green Tea Capsules - Nutraceutical Product' },
  { oldId:'27', name:'Libido Vitae Capsules',             slug:'libido-vitae-capsules',     catOldId:'5',  priceInr:1100, stock:15, details:'Libido Vitae Capsules - Health Supplement' },
  { oldId:'28', name:'ABC Capsule Nutraceutical',         slug:'abc-capsule',               catOldId:'5',  priceInr:900,  stock:25, details:'ABC Capsule - Nutraceutical Product' },
  { oldId:'29', name:'Grapeseed Extract Capsule',         slug:'grapeseed-extract-capsule', catOldId:'5',  priceInr:900,  stock:20, details:'Grapeseed Extract Capsule - Antioxidant Supplement' },
  { oldId:'30', name:'Aloe Vera Capsules',                slug:'aloe-vera-capsules',        catOldId:'5',  priceInr:800,  stock:30, details:'Aloe Vera Capsules - Health Supplement' },
  { oldId:'31', name:'Brahmi Plus Capsules',              slug:'brahmi-plus-capsules',      catOldId:'5',  priceInr:800,  stock:25, details:'Brahmi Plus Capsules - Brain Health Supplement' },
  { oldId:'32', name:'Maharshi LISET Capsules',           slug:'maharshi-liset-capsules',   catOldId:'5',  priceInr:1100, stock:15, details:'Maharshi LISET Capsules' },
  { oldId:'33', name:'Spirulina Capsules',                slug:'spirulina-capsules',        catOldId:'5',  priceInr:400,  stock:30, details:'Spirulina Capsules - Superfood Supplement' },
  { oldId:'34', name:'Maharshi Musli Vita Capsules',      slug:'maharshi-musli-vita',       catOldId:'5',  priceInr:1490, stock:15, details:'Maharshi Musli Vita Capsules' },
  { oldId:'35', name:'Anti Clot Vitae Capsules',          slug:'anti-clot-vitae-capsules',  catOldId:'5',  priceInr:1100, stock:15, details:'Anti Clot Vitae Capsules' },
  { oldId:'36', name:'Thriphala Capsules',                slug:'thriphala-capsules',        catOldId:'5',  priceInr:1100, stock:20, details:'Thriphala Capsules - Digestive Health' },
  { oldId:'37', name:'Noni Capsules Plus',                slug:'noni-capsules-plus',        catOldId:'5',  priceInr:380,  stock:30, details:'Noni Capsules Plus - Immunity Booster' },
  { oldId:'38', name:'Chyavanaprasam',                    slug:'chyavanaprasam',            catOldId:'5',  priceInr:600,  stock:20, details:'Traditional Chyavanaprasam - Ayurvedic Supplement' },
  { oldId:'39', name:'Medhanil',                          slug:'medhanil',                  catOldId:'5',  priceInr:800,  stock:15, details:'Medhanil - Herbal Brain Tonic' },
  { oldId:'40', name:'Ikshuradi Lehyam',                  slug:'ikshuradi-lehyam',          catOldId:'5',  priceInr:500,  stock:20, details:'Ikshuradi Lehyam - Traditional Herbal Jam' },
  { oldId:'41', name:'Bahusala Gudam',                    slug:'bahusala-gudam',            catOldId:'5',  priceInr:400,  stock:20, details:'Bahusala Gudam - Ayurvedic Supplement' },
  { oldId:'42', name:'Brahmi Vita',                       slug:'brahmi-vita',               catOldId:'5',  priceInr:500,  stock:20, details:'Brahmi Vita - Memory Enhancer' },
  { oldId:'43', name:'Ajamamsa Rasayanam',                slug:'ajamamsa-rasayanam',        catOldId:'5',  priceInr:400,  stock:20, details:'Ajamamsa Rasayanam - Ayurvedic Rasayana' },
  { oldId:'44', name:'Brahmi Date',                       slug:'brahmi-date',               catOldId:'5',  priceInr:600,  stock:20, details:'Brahmi Date - Brain Health Supplement' },
  { oldId:'45', name:'D-10 Dia Care Powder',              slug:'d10-dia-care-powder',       catOldId:'5',  priceInr:400,  stock:20, details:'D-10 Dia Care Powder - Diabetes Management' },
  { oldId:'46', name:'Kumkumadi Lepam',                   slug:'kumkumadi-lepam',           catOldId:'5',  priceInr:160,  stock:30, details:'Kumkumadi Lepam - Herbal Face Pack' },
  { oldId:'47', name:'Rasnadhi Choornam',                 slug:'rasnadhi-choornam',         catOldId:'5',  priceInr:70,   stock:50, details:'Rasnadhi Choornam - Herbal Powder' },
  { oldId:'48', name:'Henna Powder',                      slug:'henna-powder',              catOldId:'5',  priceInr:120,  stock:50, details:'Natural Henna Powder' },
  { oldId:'49', name:'Dahashamani',                       slug:'dahashamani',               catOldId:'5',  priceInr:100,  stock:50, details:'Dahashamani - Traditional Herbal Formulation' },
  { oldId:'50', name:'DIA VITA Granules',                 slug:'dia-vita-granules',         catOldId:'5',  priceInr:250,  stock:30, details:'DIA VITA Granules - Blood Sugar Management' },
  { oldId:'51', name:'Instant Chukku Coffee',             slug:'instant-chukku-coffee',     catOldId:'5',  priceInr:120,  stock:50, details:'Instant Chukku Coffee - Ginger Coffee Blend' },
  { oldId:'52', name:'Churidar Materials Blue',           slug:'churidar-materials-blue',   catOldId:'3',  priceInr:960,  stock:10, details:'Churidar Materials - Blue' },
  { oldId:'53', name:'Churidar Materials Pink',           slug:'churidar-materials-pink',   catOldId:'3',  priceInr:550,  stock:10, details:'Churidar Materials - Pink' },
  { oldId:'54', name:'Churidar Materials Yellow',         slug:'churidar-materials-yellow', catOldId:'3',  priceInr:450,  stock:10, details:'Churidar Materials - Yellow' },
  { oldId:'55', name:'Churidar Black',                    slug:'churidar-black',            catOldId:'3',  priceInr:875,  stock:10, details:'Churidar - Black' },
  { oldId:'56', name:'Churidar White',                    slug:'churidar-white',            catOldId:'3',  priceInr:595,  stock:10, details:'Churidar - White' },
  { oldId:'57', name:'Churidar Printed',                  slug:'churidar-printed',          catOldId:'3',  priceInr:690,  stock:10, details:'Churidar - Printed' },
];

// ─── Image filename → URL helper ──────────────────────────────────────────────

function imageUrl(filename: string | undefined): string | null {
  if (!filename) return null;
  const baseUrl = process.env.SOURCE_SITE_URL;
  if (!baseUrl) return null;
  return `${baseUrl.replace(/\/$/, '')}/storage/app/public/product/${filename}`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error('DATABASE_URL is required');

  const pool = new Pool({ connectionString: dbUrl });
  const db = drizzle(pool);

  console.log('=== BuyWell Product Import ===');
  console.log(`Source image URL: ${process.env.SOURCE_SITE_URL || '(none — images will be skipped)'}`);

  // 1. Insert categories
  console.log('\n[1] Importing categories...');
  const catIdMap = new Map<string, string>(); // oldId → new UUID

  for (const cat of CATEGORIES) {
    const existing = await db
      .select({ id: productCategories.id })
      .from(productCategories)
      .where(eq(productCategories.slug, cat.slug));

    if (existing.length > 0) {
      catIdMap.set(cat.oldId, existing[0].id);
      console.log(`  SKIP (exists): ${cat.name}`);
    } else {
      const newId = crypto.randomUUID();
      await db.insert(productCategories).values({
        id: newId,
        name: cat.name,
        slug: cat.slug,
        color: cat.color,
        sortOrder: cat.sortOrder,
        isActive: true,
      });
      catIdMap.set(cat.oldId, newId);
      console.log(`  ✓ Created: ${cat.name}`);
    }
  }

  // 2. Insert products
  console.log('\n[2] Importing products...');
  let created = 0, skipped = 0, failed = 0;

  for (const p of PRODUCTS) {
    const catId = catIdMap.get(p.catOldId) ?? null;

    // Check if slug already exists
    const existing = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.slug, p.slug));

    if (existing.length > 0) {
      skipped++;
      continue;
    }

    try {
      // Generate a clean SKU
      const sku = `IMPORT-${p.oldId.padStart(4, '0')}`;

      // Insert product
      const productId = crypto.randomUUID();
      await db.insert(products).values({
        id: productId,
        name: p.name,
        slug: p.slug,
        category: 'imported',
        categoryId: catId,
        description: p.details || p.name,
        longDesc: p.details ? `<p>${p.details}</p>` : null,
        sku,
        isActive: true,
        isFeatured: false,
        metaTitle: p.metaTitle || p.name,
        metaDesc: p.metaDesc || p.details || '',
        vendorId: null, // admin uploaded
      });

      // Insert default variant
      const variantId = crypto.randomUUID();
      await db.insert(productVariants).values({
        id: variantId,
        productId,
        name: 'Default',
        priceInr: p.priceInr * 100, // paise
        mrpInr: Math.round(p.priceInr * 100 * 1.1), // 10% MRP buffer
        stock: p.stock,
        sku: `${sku}-DEFAULT`,
        isActive: true,
        sortOrder: 0,
      });

      // Insert thumbnail as primary image
      const thumbUrl = imageUrl(p.thumbnail);
      if (thumbUrl) {
        await db.insert(productImages).values({
          id: crypto.randomUUID(),
          productId,
          url: thumbUrl,
          alt: p.name,
          isPrimary: true,
          sortOrder: 0,
        });
      }

      created++;
      console.log(`  ✓ [${p.oldId}] ${p.name} — ₹${p.priceInr} | stock: ${p.stock}${thumbUrl ? ' | 🖼' : ''}`);
    } catch (err) {
      failed++;
      console.error(`  ✗ [${p.oldId}] ${p.name}: ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log(`\n=== Done ===`);
  console.log(`Categories: ${catIdMap.size} processed`);
  console.log(`Products: ${created} created, ${skipped} skipped (existed), ${failed} failed`);

  if (!process.env.SOURCE_SITE_URL) {
    console.log(`\n⚠️  Images were NOT imported — set SOURCE_SITE_URL to the old platform's base URL`);
    console.log(`    Example: SOURCE_SITE_URL=https://oldsite.com npx tsx scripts/import-products.ts`);
    console.log(`    Then upload images manually via Admin → Media`);
  }

  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
