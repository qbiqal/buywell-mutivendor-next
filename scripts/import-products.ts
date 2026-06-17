/**
 * BuyWell Multivendor — Product Import Script
 *
 * Imports 9 categories and 55 products from the legacy platform dump.
 * All products are admin-uploaded (vendorId = null).
 * Images are served from /images/products/ (bundled in public/).
 *
 * Usage:
 *   set -a; source .env.local; set +a
 *   npx tsx scripts/import-products.ts
 *
 * Safe to re-run: uses slug-based conflict check (skips existing).
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

// ─── Categories ───────────────────────────────────────────────────────────────

const CATEGORIES = [
  { oldId: '2',  name: 'Mens Fashion',      slug: 'mens-fashion',       color: '#6366F1', sortOrder: 1 },
  { oldId: '3',  name: 'Womens Fashion',    slug: 'womens-fashion',     color: '#EC4899', sortOrder: 2 },
  { oldId: '4',  name: 'Kids Fashion',      slug: 'kids-fashion',       color: '#F59E0B', sortOrder: 3 },
  { oldId: '5',  name: 'Health N Beauty',   slug: 'health-n-beauty',    color: '#10B981', sortOrder: 4 },
  { oldId: '6',  name: 'Pet Supplies',      slug: 'pet-supplies',       color: '#8B5CF6', sortOrder: 5 },
  { oldId: '7',  name: 'Phone N Gadgets',   slug: 'phone-n-gadgets',    color: '#3B82F6', sortOrder: 6 },
  { oldId: '8',  name: 'Baby N Toddlers',   slug: 'baby-n-toddlers',    color: '#F97316', sortOrder: 7 },
  { oldId: '9',  name: 'Sports N Outdoors', slug: 'sports-n-outdoors',  color: '#22C55E', sortOrder: 8 },
  { oldId: '10', name: 'Kitchen Tools',     slug: 'kitchen-tools',      color: '#EF4444', sortOrder: 9 },
];

// ─── Products ─────────────────────────────────────────────────────────────────
// images[0] = primary (thumbnail), rest = gallery
// All paths served from /images/products/ (public/ directory in Next.js)

const PRODUCTS: Array<{
  oldId: string; name: string; slug: string; catOldId: string;
  priceInr: number; stock: number; details: string;
  images: string[];
}> = [
  {
    oldId: '1', name: 'HP Smart Watch', slug: 'hp-smart-watch', catOldId: '7',
    priceInr: 7500, stock: 3, details: 'HP Smart Watch',
    images: ['2025-11-19-691d4d396db76.webp','2025-11-19-691d4b4e4f6d8.webp','2025-11-19-691d4b4e60f10.webp','2025-11-19-691d4d3956db5.webp','2025-11-19-691d4d395e0d4.webp','2025-11-19-691d4d3965c4b.webp'],
  },
  {
    oldId: '4', name: 'Tharunyamrutha', slug: 'tharunyamrutha', catOldId: '5',
    priceInr: 500, stock: 10, details: 'Healthy Products',
    images: ['2026-01-09-6960ab8d89394.webp','2026-01-09-6960ab8d3206a.webp'],
  },
  {
    oldId: '5', name: 'Cotton Shirts', slug: 'cotton-shirts', catOldId: '2',
    priceInr: 800, stock: 19, details: 'Premium 100% Pure Cotton',
    images: ['2026-01-18-696cb4b738d44.webp','2026-01-18-696cb4b704cd1.webp'],
  },
  {
    oldId: '8', name: 'Aswagandha Rasayanam', slug: 'aswagandha-rasayanam', catOldId: '5',
    priceInr: 400, stock: 20, details: 'Aswagandha Rasayanam - Herbal Supplement',
    images: ['2026-01-19-696e6bf352b7e.webp','2026-01-19-696e6bf31f527.webp','2026-01-19-696e68bf7e8e0.webp'],
  },
  {
    oldId: '9', name: 'Chemparathy Thaali Powder', slug: 'chemparathy-thaali-powder', catOldId: '5',
    priceInr: 120, stock: 50, details: 'Traditional Chemparathy Thaali Powder',
    images: ['2026-01-19-696e716fb8f71.webp','2026-01-19-696e716f9572f.webp'],
  },
  {
    oldId: '10', name: 'Protein Powder Plus', slug: 'protein-powder-plus', catOldId: '5',
    priceInr: 900, stock: 30, details: 'Protein Powder Plus - Nutritional Supplement',
    images: ['2026-01-20-696f50151ee00.webp','2026-01-20-696f50150261e.webp'],
  },
  {
    oldId: '11', name: 'Set Saree', slug: 'set-saree', catOldId: '3',
    priceInr: 690, stock: 15, details: 'Traditional Set Saree',
    images: ['2026-01-20-696f6817e3154.webp','2026-01-20-696f6817b38b8.webp','2026-01-20-696f909660123.webp'],
  },
  {
    oldId: '12', name: 'Nighties', slug: 'nighties', catOldId: '3',
    priceInr: 250, stock: 100, details: 'Comfortable Nighties',
    images: ['2026-01-20-696f8f636c999.webp','2026-01-20-696f8f63660da.webp'],
  },
  {
    oldId: '13', name: 'BioBerry Antioxidant Health Drink', slug: 'bioberry-antioxidant-drink', catOldId: '5',
    priceInr: 2400, stock: 10, details: 'BioBerry Antioxidant Health Drink',
    images: ['2026-01-20-696f96b1cf61f.webp','2026-01-20-696f96b1b7af1.webp'],
  },
  {
    oldId: '14', name: 'Pathimugham', slug: 'pathimugham', catOldId: '5',
    priceInr: 100, stock: 100, details: 'Pathimugham - Traditional Herbal Tea',
    images: ['2026-01-21-6970d41b536ab.webp','2026-01-21-6970d41b1d2e4.webp'],
  },
  {
    oldId: '15', name: 'Kasthuri Manjal', slug: 'kasthuri-manjal', catOldId: '5',
    priceInr: 120, stock: 50, details: 'Kasthuri Manjal - Wild Turmeric',
    images: ['2026-01-21-6970d6ae107f0.webp','2026-01-21-6970d6add34cb.webp'],
  },
  {
    oldId: '16', name: 'Vitae Oxy Dandruff Oil', slug: 'vitae-oxy-dandruff-oil', catOldId: '5',
    priceInr: 240, stock: 20, details: 'Vitae Oxy Dandruff Oil - Hair Care',
    images: ['2026-01-21-6970d7e270589.webp','2026-01-21-6970d7e24e01a.webp'],
  },
  {
    oldId: '17', name: 'Quitter Mosquito Repellent', slug: 'quitter-mosquito-repellent', catOldId: '5',
    priceInr: 100, stock: 50, details: 'Natural Mosquito Repellent Solution',
    images: ['2026-01-21-6970d9c74e125.webp','2026-01-21-6970d9c7272cf.webp'],
  },
  {
    oldId: '18', name: 'Maharshi H15 Hair Care Oil', slug: 'maharshi-h15-hair-oil', catOldId: '5',
    priceInr: 199, stock: 50, details: 'Maharshi H15 Hair Care Oil',
    images: ['2026-01-21-6970da68e050a.webp','2026-01-21-6970da68c1687.webp'],
  },
  {
    oldId: '19', name: 'Maharshi H15 Hair Shampoo', slug: 'maharshi-h15-shampoo', catOldId: '5',
    priceInr: 210, stock: 50, details: 'Maharshi H15 Hair Care Shampoo',
    images: ['2026-01-21-6970db3506271.webp','2026-01-21-6970db34dbd17.webp'],
  },
  {
    oldId: '20', name: 'Maharshi Painex Pain Oil', slug: 'maharshi-painex-pain-oil', catOldId: '5',
    priceInr: 350, stock: 30, details: 'Maharshi Painex Pain Relief Oil',
    images: ['2026-01-21-6970dbef55394.webp','2026-01-21-6970dbeebb7cc.webp'],
  },
  {
    oldId: '21', name: 'Herb O Fresh Massage Oil', slug: 'herb-o-fresh-massage-oil', catOldId: '5',
    priceInr: 460, stock: 20, details: 'Herb O Fresh Massage Oil',
    images: ['2026-01-21-6970de10cf3b3.webp','2026-01-21-6970de10b8136.webp'],
  },
  {
    oldId: '22', name: 'Maharshi Noni Capsules Plus', slug: 'maharshi-noni-capsules', catOldId: '5',
    priceInr: 380, stock: 30, details: 'Maharshi Noni Capsules Plus - Health Supplement',
    images: ['2026-01-21-6970df8a6f514.webp','2026-01-21-6970df8a4cbad.webp'],
  },
  {
    oldId: '23', name: 'Vitae Oxy Pain Spray', slug: 'vitae-oxy-pain-spray', catOldId: '5',
    priceInr: 299, stock: 20, details: 'Vitae Oxy Pain Relief Spray',
    images: ['2026-01-21-6970e0996a097.webp','2026-01-21-6970e0994ddd0.webp'],
  },
  {
    oldId: '24', name: 'Thriphala Capsules Nutraceutical', slug: 'thriphala-capsules-nutra', catOldId: '5',
    priceInr: 1100, stock: 20, details: 'Thriphala Capsules - Nutraceutical Product',
    images: ['2026-01-22-69722120943cd.webp','2026-01-22-69722120711ca.webp'],
  },
  {
    oldId: '25', name: 'C-Care Capsules', slug: 'c-care-capsules', catOldId: '5',
    priceInr: 900, stock: 25, details: 'C-Care Capsules - Health Supplement',
    images: ['2026-01-22-6972231a356d3.webp','2026-01-22-69722319eec7d.webp'],
  },
  {
    oldId: '26', name: 'Green Tea Capsules Nutraceutical', slug: 'green-tea-capsules-nutra', catOldId: '5',
    priceInr: 800, stock: 25, details: 'Green Tea Capsules - Nutraceutical Product',
    images: ['2026-01-22-6972242d84b99.webp','2026-01-22-6972242d60969.webp'],
  },
  {
    oldId: '27', name: 'Libido Vitae Capsules', slug: 'libido-vitae-capsules', catOldId: '5',
    priceInr: 1100, stock: 15, details: 'Libido Vitae Capsules - Health Supplement',
    images: ['2026-01-22-697224df126e6.webp','2026-01-22-697224dedcb52.webp'],
  },
  {
    oldId: '28', name: 'ABC Capsule Nutraceutical', slug: 'abc-capsule', catOldId: '5',
    priceInr: 900, stock: 25, details: 'ABC Capsule - Nutraceutical Product',
    images: ['2026-01-22-697225d4d0806.webp','2026-01-22-697225d4ae195.webp'],
  },
  {
    oldId: '29', name: 'Grapeseed Extract Capsule', slug: 'grapeseed-extract-capsule', catOldId: '5',
    priceInr: 900, stock: 20, details: 'Grapeseed Extract Capsule - Antioxidant Supplement',
    images: ['2026-01-22-697226bc0d4aa.webp','2026-01-22-697226bbd8bf8.webp'],
  },
  {
    oldId: '30', name: 'Aloe Vera Capsules', slug: 'aloe-vera-capsules', catOldId: '5',
    priceInr: 800, stock: 30, details: 'Aloe Vera Capsules - Health Supplement',
    images: ['2026-01-22-697227c0b2c60.webp','2026-01-22-697227c08b9cc.webp'],
  },
  {
    oldId: '31', name: 'Brahmi Plus Capsules', slug: 'brahmi-plus-capsules', catOldId: '5',
    priceInr: 800, stock: 25, details: 'Brahmi Plus Capsules - Brain Health Supplement',
    images: ['2026-01-22-69722a2dd2528.webp','2026-01-22-69722a2dab600.webp'],
  },
  {
    oldId: '32', name: 'Maharshi LISET Capsules', slug: 'maharshi-liset-capsules', catOldId: '5',
    priceInr: 1100, stock: 15, details: 'Maharshi LISET Capsules',
    images: ['2026-01-22-69722af677246.webp','2026-01-22-69722af653a6c.webp'],
  },
  {
    oldId: '33', name: 'Spirulina Capsules', slug: 'spirulina-capsules', catOldId: '5',
    priceInr: 400, stock: 30, details: 'Spirulina Capsules - Superfood Supplement',
    images: ['2026-01-22-69722ba500acf.webp','2026-01-22-69722ba4cd95f.webp'],
  },
  {
    oldId: '34', name: 'Maharshi Musli Vita Capsules', slug: 'maharshi-musli-vita', catOldId: '5',
    priceInr: 1490, stock: 15, details: 'Maharshi Musli Vita Capsules',
    images: ['2026-01-22-69722c5e0eb26.webp','2026-01-22-69722c5de15e0.webp'],
  },
  {
    oldId: '35', name: 'Anti Clot Vitae Capsules', slug: 'anti-clot-vitae-capsules', catOldId: '5',
    priceInr: 1100, stock: 15, details: 'Anti Clot Vitae Capsules',
    images: ['2026-01-22-69722d94e6881.webp','2026-01-22-69722d94c5e16.webp'],
  },
  {
    oldId: '36', name: 'Thriphala Capsules', slug: 'thriphala-capsules', catOldId: '5',
    priceInr: 1100, stock: 20, details: 'Thriphala Capsules - Digestive Health',
    images: ['2026-01-22-69723042e9b1b.webp','2026-01-22-69723042c8b2e.webp'],
  },
  {
    oldId: '37', name: 'Noni Capsules Plus', slug: 'noni-capsules-plus', catOldId: '5',
    priceInr: 380, stock: 30, details: 'Noni Capsules Plus - Immunity Booster',
    images: ['2026-01-22-6972311bd2738.webp','2026-01-22-6972311bb2e6f.webp'],
  },
  {
    oldId: '38', name: 'Chyavanaprasam', slug: 'chyavanaprasam', catOldId: '5',
    priceInr: 600, stock: 20, details: 'Traditional Chyavanaprasam - Ayurvedic Supplement',
    images: ['2026-01-22-697232dcb820e.webp','2026-01-22-697232dc92727.webp'],
  },
  {
    oldId: '39', name: 'Medhanil', slug: 'medhanil', catOldId: '5',
    priceInr: 800, stock: 15, details: 'Medhanil - Herbal Brain Tonic',
    images: ['2026-01-22-6972371a6fe47.webp','2026-01-22-6972371a471a3.webp'],
  },
  {
    oldId: '40', name: 'Ikshuradi Lehyam', slug: 'ikshuradi-lehyam', catOldId: '5',
    priceInr: 500, stock: 20, details: 'Ikshuradi Lehyam - Traditional Herbal Jam',
    images: ['2026-01-22-697237fee9069.webp','2026-01-22-697237fec0f77.webp'],
  },
  {
    oldId: '41', name: 'Bahusala Gudam', slug: 'bahusala-gudam', catOldId: '5',
    priceInr: 400, stock: 20, details: 'Bahusala Gudam - Ayurvedic Supplement',
    images: ['2026-01-22-697238a6612ec.webp','2026-01-22-697238a640392.webp'],
  },
  {
    oldId: '42', name: 'Brahmi Vita', slug: 'brahmi-vita', catOldId: '5',
    priceInr: 500, stock: 20, details: 'Brahmi Vita - Memory Enhancer',
    images: ['2026-01-23-697376a3d65b1.webp','2026-01-23-697376a3a92ff.webp'],
  },
  {
    oldId: '43', name: 'Ajamamsa Rasayanam', slug: 'ajamamsa-rasayanam', catOldId: '5',
    priceInr: 400, stock: 20, details: 'Ajamamsa Rasayanam - Ayurvedic Rasayana',
    images: ['2026-01-23-69737874014d5.webp','2026-01-23-69737873cf2ae.webp'],
  },
  {
    oldId: '44', name: 'Brahmi Date', slug: 'brahmi-date', catOldId: '5',
    priceInr: 600, stock: 20, details: 'Brahmi Date - Brain Health Supplement',
    images: ['2026-01-23-6973792243dcc.webp','2026-01-23-6973792213623.webp'],
  },
  {
    oldId: '45', name: 'D-10 Dia Care Powder', slug: 'd10-dia-care-powder', catOldId: '5',
    priceInr: 400, stock: 20, details: 'D-10 Dia Care Powder - Diabetes Management',
    images: ['2026-01-23-69737ac9cf936.webp','2026-01-23-69737ac9adfc1.webp'],
  },
  {
    oldId: '46', name: 'Kumkumadi Lepam', slug: 'kumkumadi-lepam', catOldId: '5',
    priceInr: 160, stock: 30, details: 'Kumkumadi Lepam - Herbal Face Pack',
    images: ['2026-01-23-69737baedcaed.webp','2026-01-23-69737baea9c51.webp'],
  },
  {
    oldId: '47', name: 'Rasnadhi Choornam', slug: 'rasnadhi-choornam', catOldId: '5',
    priceInr: 70, stock: 50, details: 'Rasnadhi Choornam - Herbal Powder',
    images: ['2026-01-23-69737caa83e8d.webp','2026-01-23-69737caa5ca4d.webp'],
  },
  {
    oldId: '48', name: 'Henna Powder', slug: 'henna-powder', catOldId: '5',
    priceInr: 120, stock: 50, details: 'Natural Henna Powder',
    images: ['2026-01-23-69737da7cf8da.webp','2026-01-23-69737da7a43c5.webp'],
  },
  {
    oldId: '49', name: 'Dahashamani', slug: 'dahashamani', catOldId: '5',
    priceInr: 100, stock: 50, details: 'Dahashamani - Traditional Herbal Formulation',
    images: ['2026-01-23-69737e26b5965.webp','2026-01-23-69737e2689256.webp'],
  },
  {
    oldId: '50', name: 'DIA VITA Granules', slug: 'dia-vita-granules', catOldId: '5',
    priceInr: 250, stock: 30, details: 'DIA VITA Granules - Blood Sugar Management',
    images: ['2026-01-23-69737f2375d52.webp','2026-01-23-69737f2323aab.webp'],
  },
  {
    oldId: '51', name: 'Instant Chukku Coffee', slug: 'instant-chukku-coffee', catOldId: '5',
    priceInr: 120, stock: 50, details: 'Instant Chukku Coffee - Ginger Coffee Blend',
    images: ['2026-01-23-69737feaaff52.webp','2026-01-23-69737fea86565.webp'],
  },
  {
    oldId: '52', name: 'Churidar Materials Blue', slug: 'churidar-materials-blue', catOldId: '3',
    priceInr: 960, stock: 10, details: 'Churidar Materials - Blue',
    images: ['2026-02-07-6986db74a57a4.webp','2026-02-07-6986db7470eba.webp'],
  },
  {
    oldId: '53', name: 'Churidar Materials Pink', slug: 'churidar-materials-pink', catOldId: '3',
    priceInr: 550, stock: 10, details: 'Churidar Materials - Pink',
    images: ['2026-02-07-6986dee7b5e5c.webp','2026-02-07-6986dee74ed69.webp'],
  },
  {
    oldId: '54', name: 'Churidar Materials Yellow', slug: 'churidar-materials-yellow', catOldId: '3',
    priceInr: 450, stock: 10, details: 'Churidar Materials - Yellow',
    images: ['2026-02-07-6986e14db2edd.webp','2026-02-07-6986e14ce7f47.webp','2026-02-07-6986e14d2abe5.webp'],
  },
  {
    oldId: '55', name: 'Churidar Black', slug: 'churidar-black', catOldId: '3',
    priceInr: 875, stock: 10, details: 'Churidar - Black',
    images: ['2026-02-07-6986e310c4f9d.webp','2026-02-07-6986e30fefae2.webp','2026-02-07-6986e310315eb.webp','2026-02-07-6986e3105f4d1.webp','2026-02-07-6986e310926a3.webp'],
  },
  {
    oldId: '56', name: 'Churidar White', slug: 'churidar-white', catOldId: '3',
    priceInr: 595, stock: 10, details: 'Churidar - White',
    images: ['2026-02-07-6986e44a60318.webp','2026-02-07-6986e449ea56d.webp','2026-02-07-6986e44a29025.webp'],
  },
  {
    oldId: '57', name: 'Churidar Printed', slug: 'churidar-printed', catOldId: '3',
    priceInr: 690, stock: 10, details: 'Churidar - Printed',
    images: ['2026-02-07-6986e578371cc.webp','2026-02-07-6986e577c3b8d.webp','2026-02-07-6986e57803949.webp'],
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error('DATABASE_URL is required');

  const pool = new Pool({ connectionString: dbUrl });
  const db = drizzle(pool);

  console.log('=== BuyWell Product Import ===');

  // 1. Insert categories
  console.log('\n[1] Importing categories...');
  const catIdMap = new Map<string, string>();

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

    const existing = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.slug, p.slug));

    if (existing.length > 0) {
      skipped++;
      console.log(`  SKIP (exists): [${p.oldId}] ${p.name}`);
      continue;
    }

    try {
      const sku = `IMPORT-${p.oldId.padStart(4, '0')}`;
      const productId = crypto.randomUUID();

      await db.insert(products).values({
        id: productId,
        name: p.name,
        slug: p.slug,
        category: 'imported',
        categoryId: catId,
        description: p.details,
        longDesc: `<p>${p.details}</p>`,
        sku,
        isActive: true,
        isFeatured: false,
        metaTitle: p.name,
        metaDesc: p.details,
        vendorId: null,
      });

      // Default variant (price in paise)
      await db.insert(productVariants).values({
        id: crypto.randomUUID(),
        productId,
        name: 'Default',
        priceInr: p.priceInr * 100,
        mrpInr: Math.round(p.priceInr * 100 * 1.1),
        stock: p.stock,
        sku: `${sku}-DEFAULT`,
        isActive: true,
        sortOrder: 0,
      });

      // Images served from /images/products/ (bundled in public/)
      for (let idx = 0; idx < p.images.length; idx++) {
        await db.insert(productImages).values({
          id: crypto.randomUUID(),
          productId,
          url: `/images/products/${p.images[idx]}`,
          alt: p.name,
          isPrimary: idx === 0,
          sortOrder: idx,
        });
      }

      created++;
      console.log(`  ✓ [${p.oldId}] ${p.name} — ₹${p.priceInr} | ${p.images.length} image(s)`);
    } catch (err) {
      failed++;
      console.error(`  ✗ [${p.oldId}] ${p.name}: ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log(`\n=== Done ===`);
  console.log(`Categories: ${catIdMap.size} processed`);
  console.log(`Products: ${created} created, ${skipped} skipped, ${failed} failed`);

  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
