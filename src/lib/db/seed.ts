import fs from "fs";
import path from "path";
import {
  users, products, productVariants, productImages,
  blogCategories, cmsSections, siteConfig,
} from "./schema";
import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";

function loadLocalEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    process.env[key] ??= value;
  }
}

async function seed() {
  loadLocalEnv();
  const { db, pool } = await import("./index");

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

  // ── Development customer user ──────────────────────────────────────────────
  const customerEmail = "customer@aprasnaturals.com";
  const existingCustomer = await db.select().from(users).where(eq(users.email, customerEmail));
  if (existingCustomer.length === 0) {
    await db.insert(users).values({
      email: customerEmail,
      passwordHash: await bcrypt.hash("customer123", 12),
      firstName: "Customer",
      lastName: "APRAS",
      phone: "+919999999999",
      role: "customer",
      isActive: true,
      emailVerified: true,
    });
    console.log("✓ Demo customer created: customer@aprasnaturals.com / customer123");
  } else {
    console.log("○ Demo customer already exists");
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

  // ── Product image galleries ────────────────────────────────────────────────
  const productGalleries = {
    "tulsi-honey": [
      "/landing-assets/images/highres/tulsi-honey.jpeg",
      "/landing-assets/images/honey-group.jpeg",
      "/landing-assets/images/highres/honey-honey.jpeg",
    ],
    "karanj-honey": [
      "/landing-assets/images/highres/karang-honey.jpeg",
      "/landing-assets/images/honey-group.jpeg",
      "/landing-assets/images/highres/honey-honey.jpeg",
    ],
    "moringa-honey": [
      "/landing-assets/images/highres/moringa-honey.jpeg",
      "/landing-assets/images/honey-group.jpeg",
      "/landing-assets/images/highres/honey-honey.jpeg",
    ],
    "a2-bilona-ghee": [
      "/landing-assets/images/highres/ghee.jpeg",
      "/landing-assets/images/highres/ghee-detail.jpeg",
      "/landing-assets/images/ghee-group.jpeg",
    ],
  } as const;

  for (const [slug, gallery] of Object.entries(productGalleries)) {
    const [product] = await db.select().from(products).where(eq(products.slug, slug));
    if (!product) continue;
    const existingImages = await db.select().from(productImages).where(eq(productImages.productId, product.id));
    if (existingImages.length > 0) {
      console.log(`○ ${product.name} image gallery already exists`);
      continue;
    }
    await db.insert(productImages).values(gallery.map((url, index) => ({
      productId: product.id,
      url,
      alt: `${product.name} ${index + 1}`,
      isPrimary: index === 0,
      sortOrder: index,
    })));
    console.log(`✓ ${product.name} image gallery created with ${gallery.length} images`);
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
    { sectionKey: "hero",          sortOrder: 1,  config: {
      heading: "Nature's",
      accent: "Liquid Gold",
      subheading: "Uncompromised. Unprocessed. Unadulterated.",
      meta: "Mono-Floral Honey · A2 Bilona Ghee · Free Samples",
      badgeText: "Authorized Partner of Prakvedaa",
      videoUrl: "/landing-assets/videos/APRUS.mp4",
      primaryCtaLabel: "Explore Collection",
      secondaryCtaLabel: "Contact Us",
    } },
    { sectionKey: "marquee",       sortOrder: 2,  config: { items: ["PURE RAW HONEY", "100% AUTHENTIC", "LAB TESTED PURITY", "NO ADDED SUGAR", "MONO FLORAL SOURCED", "A2 BILONA GHEE"] } },
    { sectionKey: "promise",       sortOrder: 3,  config: {
      eyebrow: "The APRAS Promise",
      heading: "Authorized Partner of",
      accent: "Prakvedaa",
      lead: "At APRAS Naturals, every jar is sourced ethically, prepared traditionally, and delivered with zero compromise.",
      cards: [
        { icon: "verified_user", title: "100% Authentic", body: "Directly sourced from trusted traditional beekeepers in untouched natural habitats. No intermediaries, no adulteration." },
        { icon: "spa", title: "Ethically Sourced", body: "Supporting sustainable harvesting that protects local farmers, communities, and bee populations across India's heartland." },
        { icon: "science", title: "Lab Tested", body: "Every batch is verified in certified laboratories to guarantee purity and superior nutritional value." },
      ],
    } },
    { sectionKey: "sample",        sortOrder: 4,  config: {
      eyebrow: "Limited Offer",
      heading: "Try Before You",
      accent: "Trust",
      lead: "We believe real purity speaks for itself. That's why we offer free samples to select customers.",
      boxTitle: "Free Sample Program",
      boxText: "Selected customers receive a complimentary sample of our mono-floral honey. Start with a sample request and we will confirm availability.",
      buttonLabel: "Request Free Sample",
    } },
    { sectionKey: "purity",        sortOrder: 5,  config: {
      eyebrow: "Not All Honey is Real",
      heading: "Prakvedaa is the",
      accent: "real one.",
      lead: "Mono Floral · Raw · Completely Uncompromised",
      imageUrl: "/landing-assets/images/highres/honey-honey.jpeg",
      imageAlt: "Raw mono-floral honey jar",
    } },
    { sectionKey: "products",      sortOrder: 6,  config: {
      eyebrow: "Our Collection",
      heading: "Pure Mono-Floral Honey",
      lead: "Raw, single-source honeys carefully harvested from nature's finest blossoms. Available in 500g and 1kg.",
      items: [
        { name: "Tulsi Honey", slug: "tulsi-honey", badge: "Herbal", badgeIcon: "eco", img: "/landing-assets/images/highres/tulsi-honey.jpeg", desc: "Sourced from sacred Tulsi blossoms. Distinct herbal notes with powerful immunity-boosting properties.", tags: ["100% Natural", "Lab Tested", "Raw"], price: "₹499" },
        { name: "Karanj Honey", slug: "karanj-honey", badge: "Earthy", badgeIcon: "forest", img: "/landing-assets/images/highres/karang-honey.jpeg", desc: "A unique earthy profile harvested from the Karanj tree. Rare, deeply aromatic, and nutrient-rich.", tags: ["No Added Sugar", "Mono Floral"], price: "₹549" },
        { name: "Moringa Honey", slug: "moringa-honey", badge: "Superfood", badgeIcon: "auto_awesome", img: "/landing-assets/images/highres/moringa-honey.jpeg", desc: "Rich and robust, collected from the Miracle Tree blossoms. Nature's most potent and nourishing honey.", tags: ["Raw", "Unprocessed"], price: "₹599" },
      ],
    } },
    { sectionKey: "ghee",          sortOrder: 7,  config: {
      eyebrow: "Crafted the Old Way",
      heading: "Prakvedaa A2",
      headingLine2: "Bilona Ghee",
      subtitle: "This is Ghee — Not Factory Fat.",
      description: "Made from the milk of indigenous Kankrej cows using the ancient Bilona method. Curd → Hand Churned → Slow Heated. No shortcuts.",
      differenceHeading: "Why it's different",
      differences: ["A2 Milk from Indigenous Kankrej Cows", "Authentic Bilona Method, Not Cream-Based", "Wooden-Churned in Small Batches", "Zero Chemicals. Zero Shortcuts."],
      images: ["/landing-assets/images/ghee-group.jpeg", "/landing-assets/images/highres/ghee.jpeg", "/landing-assets/images/highres/ghee-detail.jpeg"],
    } },
    { sectionKey: "gallery",       sortOrder: 8,  config: {
      eyebrow: "Our Community",
      heading: "APRAS in the Field",
      lead: "Connecting directly with customers at exhibitions, fairs, and community events across India.",
      items: [
        { img: "/landing-assets/images/fair.jpeg", title: "Connecting with customers at local fairs across Jharkhand." },
        { img: "/landing-assets/images/exhibition.jpeg", title: "Showcasing our full range at regional exhibitions." },
        { img: "/landing-assets/images/recognition.jpeg", title: "Honoured by VIP recognition at a state-level exhibition." },
      ],
    } },
    { sectionKey: "leadership",    sortOrder: 9,  config: { eyebrow: "Government Recognition", heading: "Honoured by", accent: "Leadership", body: "We were privileged to welcome the Health Minister of Jharkhand to our stall. His appreciation strengthens our resolve to bring pure natural products to every Indian home." } },
    { sectionKey: "testimonials",  sortOrder: 10, config: {
      eyebrow: "Testimonials",
      heading: "Customer Stories",
      lead: "Hear from those who have made the switch to real, authentic honey and ghee.",
      items: [
        { quote: "The difference in taste is absolutely unbelievable.", mediaUrl: "", mediaType: "" },
        { quote: "Finally, Ghee that reminds me of home — made the right way.", mediaUrl: "", mediaType: "" },
        { quote: "My kids love the Karanj honey. Pure, real taste.", mediaUrl: "", mediaType: "" },
      ],
    } },
    { sectionKey: "how_it_works",  sortOrder: 11, config: { eyebrow: "Purchase Process", heading: "Simple as Nature Intended", lead: "Three steps from curiosity to your first spoonful of pure honey." } },
    { sectionKey: "mission",       sortOrder: 12, config: { quote: "To reconnect people with the pure, untampered gifts of nature.", attribution: "APRAS Naturals Mission" } },
    { sectionKey: "faq",           sortOrder: 13, config: {
      eyebrow: "Got Questions?",
      heading: "Frequently Asked",
      items: [
        { question: "Why does my honey look crystallized or solid?", answer: "Crystallization is completely natural and a sign of pure, raw honey. Real honey contains natural sugars that crystallize over time. To soften it, place the jar in warm water for a few minutes." },
        { question: "What does Mono-Floral mean?", answer: "Mono-floral means bees primarily collected nectar from one specific flower such as Tulsi, Karanj, or Moringa. Each honey keeps its own natural taste profile without artificial additions." },
        { question: "What is Bilona Ghee?", answer: "Bilona is the traditional Indian method of making ghee. A2 milk becomes curd, the curd is wooden-churned into butter, and the butter is slow-heated into rich ghee." },
        { question: "Can I get a free sample before ordering?", answer: "Yes. APRAS Naturals offers free samples to selected customers. Use the contact form and the team will confirm availability." },
      ],
    } },
    { sectionKey: "contact",       sortOrder: 14, config: {
      eyebrow: "Contact Us",
      heading: "Talk to APRAS Naturals",
      lead: "For samples, product questions, partnership enquiries, or support, send us a message and we will respond within 24 hours.",
      enquiryOptions: ["General product enquiry", "Honey product enquiry", "A2 Bilona Ghee enquiry", "Sample request", "Bulk / wholesale enquiry", "Partnership / distribution enquiry", "Order or delivery support"],
    } },
  ];

  for (const s of sections) {
    await db.insert(cmsSections).values(s).onConflictDoUpdate({
      target: cmsSections.sectionKey,
      set: {
        config: sql`excluded.config || coalesce(${cmsSections.config}, '{}'::jsonb)`,
        updatedAt: new Date(),
      },
    });
  }
  console.log(`✓ ${sections.length} CMS sections seeded`);

  console.log("\n✅ Seed complete!");
  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
