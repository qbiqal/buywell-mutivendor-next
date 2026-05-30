import { db } from "./index";
import { pool } from "./index";
import {
  users, products, productVariants, productImages,
  blogCategories, cmsSections, siteConfig,
} from "./schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("Seeding APRAS Naturals database...\n");

  // ── Admin user ──────────────────────────────────────────────────────────────
  const adminEmail = "admin@aprasnaturals.com";
  const existing = await db.select().from(users).where(eq(users.email, adminEmail));
  if (existing.length === 0) {
    await db.insert(users).values({
      email: adminEmail,
      passwordHash: await bcrypt.hash("admin123", 12),
      firstName: "Admin",
      lastName: "APRAS",
      role: "admin",
      isActive: true,
      emailVerified: true,
    });
    console.log("✓ Admin user created: admin@aprasnaturals.com / admin123");
    console.log("  ⚠️  CHANGE THIS PASSWORD IMMEDIATELY AFTER FIRST LOGIN!");
  } else {
    console.log("○ Admin user already exists");
  }

  // ── Honey products ──────────────────────────────────────────────────────────
  const honeyProducts = [
    {
      name: "Tulsi Honey",
      slug: "tulsi-honey",
      category: "honey",
      subCategory: "tulsi",
      description: "Pure mono-floral honey sourced from sacred Tulsi blossoms. Distinct herbal notes with powerful immunity-boosting properties.",
      sku: "TULSI-HONEY",
      isFeatured: true,
      sortOrder: 1,
      variants: [
        { name: "500g", priceInr: 49900, mrpInr: 59900, weight: "500g", sku: "TULSI-500G", stock: 50 },
        { name: "1kg",  priceInr: 94900, mrpInr: 109900, weight: "1kg", sku: "TULSI-1KG",  stock: 30 },
      ],
    },
    {
      name: "Karanj Honey",
      slug: "karanj-honey",
      category: "honey",
      subCategory: "karanj",
      description: "A unique earthy profile harvested from the Karanj tree — rare, deeply aromatic, and nutrient-rich.",
      sku: "KARANJ-HONEY",
      isFeatured: true,
      sortOrder: 2,
      variants: [
        { name: "500g", priceInr: 54900, mrpInr: 64900, weight: "500g", sku: "KARANJ-500G", stock: 40 },
        { name: "1kg",  priceInr: 99900, mrpInr: 114900, weight: "1kg", sku: "KARANJ-1KG",  stock: 25 },
      ],
    },
    {
      name: "Moringa Honey",
      slug: "moringa-honey",
      category: "honey",
      subCategory: "moringa",
      description: "Rich and robust honey collected from Moringa (Miracle Tree) blossoms. Nature's most potent and nourishing honey.",
      sku: "MORINGA-HONEY",
      isFeatured: true,
      sortOrder: 3,
      variants: [
        { name: "500g", priceInr: 59900, mrpInr: 69900, weight: "500g", sku: "MORINGA-500G", stock: 35 },
        { name: "1kg",  priceInr: 109900, mrpInr: 124900, weight: "1kg", sku: "MORINGA-1KG", stock: 20 },
      ],
    },
  ];

  for (const p of honeyProducts) {
    const existingP = await db.select().from(products).where(eq(products.slug, p.slug));
    if (existingP.length > 0) { console.log(`○ ${p.name} already exists`); continue; }
    const { variants, ...productData } = p;
    const [inserted] = await db.insert(products).values(productData).returning();
    for (const v of variants) {
      await db.insert(productVariants).values({ ...v, productId: inserted.id });
    }
    console.log(`✓ ${p.name} created with ${variants.length} variants`);
  }

  // ── Ghee product ────────────────────────────────────────────────────────────
  const gheeSlug = "a2-bilona-ghee";
  const existingGhee = await db.select().from(products).where(eq(products.slug, gheeSlug));
  if (existingGhee.length === 0) {
    const [ghee] = await db.insert(products).values({
      name: "A2 Bilona Cow Ghee",
      slug: gheeSlug,
      category: "ghee",
      subCategory: "a2-bilona",
      description: "Made from the milk of indigenous Kankrej cows using the ancient Bilona method. Wooden-churned, slow-heated. Zero shortcuts.",
      sku: "A2-GHEE",
      isFeatured: true,
      sortOrder: 4,
    }).returning();
    await db.insert(productVariants).values([
      { name: "250ml",  priceInr: 49900, mrpInr: 59900, weight: "250ml",  sku: "GHEE-250ML",  stock: 30, productId: ghee.id },
      { name: "500ml",  priceInr: 94900, mrpInr: 109900, weight: "500ml", sku: "GHEE-500ML",  stock: 25, productId: ghee.id },
      { name: "1 Litre",priceInr: 179900, mrpInr: 199900, weight: "1L",   sku: "GHEE-1L",     stock: 15, productId: ghee.id },
    ]);
    console.log("✓ A2 Bilona Ghee created with 3 variants");
  } else {
    console.log("○ A2 Bilona Ghee already exists");
  }

  // ── Blog categories ─────────────────────────────────────────────────────────
  const blogCats = [
    { name: "Wellness",   slug: "wellness",   color: "#16A34A" },
    { name: "Beekeeping", slug: "beekeeping", color: "#D97706" },
    { name: "Recipes",    slug: "recipes",    color: "#EA580C" },
    { name: "News",       slug: "news",       color: "#2563EB" },
  ];
  for (const cat of blogCats) {
    const exists = await db.select().from(blogCategories).where(eq(blogCategories.slug, cat.slug));
    if (exists.length === 0) {
      await db.insert(blogCategories).values({ ...cat, sortOrder: blogCats.indexOf(cat) });
      console.log(`✓ Blog category: ${cat.name}`);
    }
  }

  // ── CMS sections default config ─────────────────────────────────────────────
  const sections = [
    { sectionKey: "hero",          sortOrder: 1,  config: { heading: "Nature's Liquid Gold", subheading: "Uncompromised. Unprocessed. Unadulterated.", badgeText: "Authorized Partner of Prakvedaa" } },
    { sectionKey: "marquee",       sortOrder: 2,  config: { items: ["PURE RAW HONEY", "100% AUTHENTIC", "LAB TESTED PURITY", "NO ADDED SUGAR", "MONO FLORAL SOURCED", "A2 BILONA GHEE"] } },
    { sectionKey: "promise",       sortOrder: 3,  config: { eyebrow: "The APRAS Promise", heading: "Authorized Partner of Prakvedaa" } },
    { sectionKey: "purity",        sortOrder: 4,  config: { eyebrow: "Not All Honey is Real", heading: "Prakvedaa is the real one." } },
    { sectionKey: "products",      sortOrder: 5,  config: { eyebrow: "Our Collection", heading: "Pure Mono-Floral Honey" } },
    { sectionKey: "ghee",          sortOrder: 6,  config: { eyebrow: "Crafted the Old Way", heading: "Prakvedaa A2 Bilona Ghee" } },
    { sectionKey: "gallery",       sortOrder: 7,  config: { eyebrow: "Our Community", heading: "APRAS in the Field" } },
    { sectionKey: "leadership",    sortOrder: 8,  config: { eyebrow: "Government Recognition", heading: "Honoured by Leadership" } },
    { sectionKey: "testimonials",  sortOrder: 9,  config: { eyebrow: "Testimonials", heading: "Customer Stories" } },
    { sectionKey: "how_it_works",  sortOrder: 10, config: { eyebrow: "Purchase Process", heading: "Simple as Nature Intended" } },
    { sectionKey: "mission",       sortOrder: 11, config: { quote: "To reconnect people with the pure, untampered gifts of nature." } },
    { sectionKey: "faq",           sortOrder: 12, config: { eyebrow: "Got Questions?", heading: "Frequently Asked" } },
    { sectionKey: "cta",           sortOrder: 13, config: { heading: "Place Your Order", subheading: "Register below or request a free sample." } },
  ];

  for (const s of sections) {
    await db.insert(cmsSections).values(s).onConflictDoNothing();
  }
  console.log(`✓ ${sections.length} CMS sections seeded`);

  console.log("\n✅ Seed complete!");
  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
