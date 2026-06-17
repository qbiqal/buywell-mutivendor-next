import fs from "fs";
import path from "path";
import {
  users, products, productVariants, productImages,
  blogCategories, cmsSections, siteConfig,
  cmsMenus, cmsMenuItems, productCategories,
  contentTags, cmsPages, complianceChecks,
  notificationWallets,
} from "./schema";
import bcrypt from "bcryptjs";
import { and, eq, sql } from "drizzle-orm";

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

interface SeedMenuItem {
  label: string;
  href: string;
  itemType: string;
  sortOrder: number;
  policyType?: string;
  parentLabel?: string;
  opensNewTab?: boolean;
}

async function seed() {
  loadLocalEnv();
  const { db, pool } = await import("./index");

  console.log("Seeding BuyWell Marketplace database...\n");

  // ── Admin user ──────────────────────────────────────────────────────────────
  const adminEmail = "admin@buywell.in";
  const existing = await db.select().from(users).where(eq(users.email, adminEmail));
  if (existing.length === 0) {
    await db.insert(users).values({
      email: adminEmail,
      passwordHash: await bcrypt.hash("admin123", 12),
      firstName: "Admin",
      lastName: "BuyWell",
      role: "admin",
      isActive: true,
      emailVerified: true,
    });
    console.log("✓ Admin user created: admin@buywell.in / admin123");
    console.log("  ⚠️  CHANGE THIS PASSWORD IMMEDIATELY AFTER FIRST LOGIN!");
  } else {
    console.log("○ Admin user already exists");
  }

  const qbiqalEmail = "qbiqal@qbiqal.com";
  const existingQbiqal = await db.select().from(users).where(eq(users.email, qbiqalEmail));
  if (existingQbiqal.length === 0) {
    await db.insert(users).values({
      email: qbiqalEmail,
      passwordHash: await bcrypt.hash("qbiqal123", 12),
      firstName: "Qbiqal",
      lastName: "Super Admin",
      role: "qbiqal",
      isActive: true,
      emailVerified: true,
    });
    console.log("✓ Qbiqal super admin created: qbiqal@qbiqal.com / qbiqal123");
    console.log("  ⚠️  CHANGE THIS PASSWORD IMMEDIATELY AFTER FIRST LOGIN!");
  } else {
    console.log("○ Qbiqal super admin already exists");
  }

  // ── Development customer user ──────────────────────────────────────────────
  const customerEmail = "customer@buywell.in";
  const existingCustomer = await db.select().from(users).where(eq(users.email, customerEmail));
  if (existingCustomer.length === 0) {
    await db.insert(users).values({
      email: customerEmail,
      passwordHash: await bcrypt.hash("customer123", 12),
      firstName: "Customer",
      lastName: "BuyWell",
      phone: "+919999999999",
      role: "customer",
      isActive: true,
      emailVerified: true,
    });
    console.log("✓ Demo customer created: customer@buywell.in / customer123");
  } else {
    console.log("○ Demo customer already exists");
  }

  // ── Site configuration defaults ────────────────────────────────────────────
  const configDefaults = [
    { key: "whatsapp_provider", value: "waha", category: "whatsapp", label: "WhatsApp Provider" },
    { key: "whatsapp_waha_base_url", value: "https://whatsapp-gateway.qbiqal.com/", category: "whatsapp", label: "WAHA Base URL" },
    { key: "whatsapp_waha_session", value: "default", category: "whatsapp", label: "WAHA Session" },
    { key: "whatsapp_waha_chat_suffix", value: "@c.us", category: "whatsapp", label: "WAHA Chat Suffix" },
    { key: "notification_whatsapp_enabled", value: "true", category: "notification", label: "WhatsApp Notifications" },
    { key: "notification_email_enabled", value: "true", category: "notification", label: "Email Notifications" },
    { key: "notification_sms_enabled", value: "false", category: "notification", label: "SMS Notifications" },
  ];
  for (const item of configDefaults) {
    await db.insert(siteConfig).values(item).onConflictDoUpdate({
      target: siteConfig.key,
      set: { category: item.category, label: item.label, updatedAt: new Date() },
    });
  }
  const configCategoryBackfill = [
    { prefix: "module_", category: "modules" },
    { prefix: "notification_", category: "notification" },
    { prefix: "otp_", category: "otp" },
    { prefix: "whatsapp_", category: "whatsapp" },
    { prefix: "media_", category: "media" },
    { prefix: "payment_", category: "payment" },
    { prefix: "shipping_", category: "shipping" },
    { prefix: "locale_", category: "localization" },
    { prefix: "locales_", category: "localization" },
    { prefix: "currency_", category: "localization" },
    { prefix: "currencies_", category: "localization" },
    { prefix: "sentry_", category: "observability" },
  ];
  for (const item of configCategoryBackfill) {
    await db.update(siteConfig)
      .set({ category: item.category, updatedAt: new Date() })
      .where(sql`${siteConfig.key} like ${`${item.prefix}%`}`);
  }
  console.log(`✓ ${configDefaults.length} site configuration defaults ensured`);

  const walletChannels = ["whatsapp", "email", "sms"] as const;
  for (const channel of walletChannels) {
    await db.insert(notificationWallets).values({ channel }).onConflictDoNothing();
  }
  console.log(`✓ ${walletChannels.length} notification wallets ensured`);

  // ── Honey products ──────────────────────────────────────────────────────────
  const productCats = [
    { name: "Honey", slug: "honey", color: "#D97706", sortOrder: 1 },
    { name: "Tulsi Honey", slug: "tulsi-honey-category", parentSlug: "honey", color: "#16A34A", sortOrder: 2 },
    { name: "Karanj Honey", slug: "karanj-honey-category", parentSlug: "honey", color: "#A16207", sortOrder: 3 },
    { name: "Moringa Honey", slug: "moringa-honey-category", parentSlug: "honey", color: "#22C55E", sortOrder: 4 },
    { name: "A2 Ghee", slug: "a2-ghee", color: "#B45309", sortOrder: 5 },
  ];

  const productCategoryIds = new Map<string, string>();
  for (const cat of productCats) {
    const [parent] = cat.parentSlug
      ? await db.select().from(productCategories).where(eq(productCategories.slug, cat.parentSlug)).limit(1)
      : [];
    await db.insert(productCategories).values({
      name: cat.name,
      slug: cat.slug,
      parentId: parent?.id ?? null,
      color: cat.color,
      sortOrder: cat.sortOrder,
    }).onConflictDoNothing();
    const [saved] = await db.select().from(productCategories).where(eq(productCategories.slug, cat.slug)).limit(1);
    if (saved) productCategoryIds.set(cat.slug, saved.id);
  }
  console.log(`✓ ${productCats.length} product categories ensured`);

  const honeyProducts = [
    {
      name: "Tulsi Honey",
      slug: "tulsi-honey",
      category: "honey",
      categoryId: productCategoryIds.get("tulsi-honey-category") ?? null,
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
      categoryId: productCategoryIds.get("karanj-honey-category") ?? null,
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
      categoryId: productCategoryIds.get("moringa-honey-category") ?? null,
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
      categoryId: productCategoryIds.get("a2-ghee") ?? null,
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

  const productCategoryBackfill = {
    "tulsi-honey": productCategoryIds.get("tulsi-honey-category") ?? null,
    "karanj-honey": productCategoryIds.get("karanj-honey-category") ?? null,
    "moringa-honey": productCategoryIds.get("moringa-honey-category") ?? null,
    "a2-bilona-ghee": productCategoryIds.get("a2-ghee") ?? null,
  } as const;
  for (const [slug, categoryId] of Object.entries(productCategoryBackfill)) {
    if (!categoryId) continue;
    await db.update(products).set({ categoryId, updatedAt: new Date() }).where(eq(products.slug, slug));
  }
  console.log("✓ Existing product category links backfilled");

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
    { name: "Immunity",   slug: "immunity",   color: "#22C55E", parentSlug: "wellness" },
    { name: "Beekeeping", slug: "beekeeping", color: "#D97706" },
    { name: "Recipes",    slug: "recipes",    color: "#EA580C" },
    { name: "News",       slug: "news",       color: "#2563EB" },
  ];
  for (const cat of blogCats) {
    const { parentSlug, ...catValues } = cat;
    const [parent] = cat.parentSlug
      ? await db.select().from(blogCategories).where(eq(blogCategories.slug, cat.parentSlug)).limit(1)
      : [];
    const exists = await db.select().from(blogCategories).where(eq(blogCategories.slug, cat.slug));
    if (exists.length === 0) {
      await db.insert(blogCategories).values({ ...catValues, parentId: parent?.id ?? null, sortOrder: blogCats.indexOf(cat) });
      console.log(`✓ Blog category: ${cat.name}`);
    }
  }

  const defaultTags = [
    { moduleKey: "blog", name: "Raw Honey", slug: "blog-raw-honey", color: "#D97706" },
    { moduleKey: "blog", name: "Wellness", slug: "blog-wellness", color: "#16A34A" },
    { moduleKey: "blog", name: "A2 Ghee", slug: "blog-a2-ghee", color: "#B45309" },
    { moduleKey: "product", name: "Lab Tested", slug: "product-lab-tested", color: "#2563EB" },
    { moduleKey: "product", name: "No Added Sugar", slug: "product-no-added-sugar", color: "#16A34A" },
    { moduleKey: "product", name: "Mono Floral", slug: "product-mono-floral", color: "#D97706" },
    { moduleKey: "cms", name: "Policy", slug: "cms-policy", color: "#6B7280" },
  ];
  for (const tag of defaultTags) {
    await db.insert(contentTags).values(tag).onConflictDoNothing();
  }
  console.log(`✓ ${defaultTags.length} content tags ensured`);

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
      eyebrow: "The BuyWell Promise",
      heading: "Authorized Partner of",
      accent: "Prakvedaa",
      lead: "At BuyWell Marketplace, every jar is sourced ethically, prepared traditionally, and delivered with zero compromise.",
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
      heading: "BuyWell in the Field",
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
    { sectionKey: "mission",       sortOrder: 12, config: { quote: "To reconnect people with the pure, untampered gifts of nature.", attribution: "BuyWell Marketplace Mission" } },
    { sectionKey: "faq",           sortOrder: 13, config: {
      eyebrow: "Got Questions?",
      heading: "Frequently Asked",
      items: [
        { question: "Why does my honey look crystallized or solid?", answer: "Crystallization is completely natural and a sign of pure, raw honey. Real honey contains natural sugars that crystallize over time. To soften it, place the jar in warm water for a few minutes." },
        { question: "What does Mono-Floral mean?", answer: "Mono-floral means bees primarily collected nectar from one specific flower such as Tulsi, Karanj, or Moringa. Each honey keeps its own natural taste profile without artificial additions." },
        { question: "What is Bilona Ghee?", answer: "Bilona is the traditional Indian method of making ghee. A2 milk becomes curd, the curd is wooden-churned into butter, and the butter is slow-heated into rich ghee." },
        { question: "Can I get a free sample before ordering?", answer: "Yes. BuyWell Marketplace offers free samples to selected customers. Use the contact form and the team will confirm availability." },
      ],
    } },
    { sectionKey: "contact",       sortOrder: 14, config: {
      eyebrow: "Contact Us",
      heading: "Talk to BuyWell Marketplace",
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

  // ── Policy CMS pages ───────────────────────────────────────────────────────
  const policyPages = [
    {
      title: "Terms and Conditions",
      slug: "terms-and-conditions",
      policyType: "terms",
      moduleKey: "core",
      excerpt: "Terms governing use of BuyWell Marketplace, orders, accounts, product information, and customer responsibilities.",
      content: [
        "<p><strong>Last reviewed:</strong> 2 June 2026</p>",
        "<p>Welcome to BuyWell Marketplace. These Terms and Conditions govern your access to our website, account features, product catalogue, CMS pages, blog content, ecommerce checkout, order support, reviews, refunds, and related services. BuyWell Marketplace offers pure mono-floral honey, A2 Bilona Ghee, and natural wellness products as an authorized partner and CNF of Prakvedaa.</p>",
        "<h2>Using Our Website</h2>",
        "<p>You agree to use the website only for lawful personal, household, or permitted business purchase purposes. You must not misuse the platform, interfere with security, scrape data, impersonate another person, upload harmful content, or attempt unauthorized access to admin, customer, payment, notification, or media systems.</p>",
        "<h2>Accounts and Accuracy</h2>",
        "<p>You are responsible for keeping account credentials confidential and for providing accurate name, phone, email, billing, delivery, and order information. BuyWell Marketplace may suspend or restrict access where account activity appears fraudulent, abusive, unlawful, or harmful to customers, staff, partners, or platform integrity.</p>",
        "<h2>Products and Information</h2>",
        "<p>We aim to present product descriptions, ingredients, sizes, prices, images, availability, and educational content accurately. Natural products such as raw honey and ghee may vary in colour, aroma, texture, crystallization, and batch character. Product information is not medical advice and should not replace professional health guidance.</p>",
        "<h2>Orders, Pricing, and Payment</h2>",
        "<p>Order acceptance depends on product availability, serviceability, payment confirmation, fraud screening, and operational checks. Prices, offers, taxes, shipping fees, and free sample availability may change. If an obvious pricing or listing error occurs, we may cancel, refund, or contact you before processing the order.</p>",
        "<h2>Shipping, Returns, Refunds, and Cancellations</h2>",
        "<p>Shipping, replacement, cancellation, and refund requests are governed by the dedicated policies linked from this website. Food and consumable items may have safety-based return restrictions, especially once opened, consumed, damaged after delivery, or handled outside recommended storage conditions.</p>",
        "<h2>Reviews, Comments, and User Content</h2>",
        "<p>Members may post reviews or blog comments where enabled. Content must be honest, relevant, non-abusive, non-infringing, and lawful. We may moderate, reject, edit display formatting, or remove content that contains spam, hate, abuse, personal data of others, unsafe claims, or misleading statements.</p>",
        "<h2>Intellectual Property</h2>",
        "<p>The BuyWell Marketplace brand, product presentation, website design, photographs, text, graphics, and software are protected by applicable intellectual property laws. You may not copy, reproduce, resell, or exploit the website content without written permission, except for ordinary personal use and sharing website links.</p>",
        "<h2>Limitation of Liability</h2>",
        "<p>To the maximum extent permitted by law, BuyWell Marketplace is not liable for indirect, incidental, consequential, punitive, or special losses arising from website use, delayed delivery, unavailable products, third-party services, network issues, or customer misuse. Nothing in these terms excludes liability that cannot legally be excluded.</p>",
        "<h2>Changes and Contact</h2>",
        "<p>We may update these terms to reflect operational, legal, security, or service changes. The current version will be published on this page. For questions, contact BuyWell Marketplace at hello@buywell.in or +91 9470309006.</p>",
      ].join(""),
    },
    {
      title: "Privacy Policy",
      slug: "privacy-policy",
      policyType: "privacy",
      moduleKey: "core",
      excerpt: "How BuyWell Marketplace collects, uses, shares, stores, and protects personal data under DPDP and GDPR readiness principles.",
      content: [
        "<p><strong>Last reviewed:</strong> 2 June 2026</p>",
        "<p>This Privacy Policy explains how BuyWell Marketplace collects and processes personal data when you browse the website, create an account, place orders, request samples, submit reviews or comments, contact support, receive notifications, or interact with our marketing and analytics features.</p>",
        "<h2>Who We Are</h2>",
        "<p>BuyWell Marketplace operates from Ranchi, Jharkhand and offers natural honey, A2 Bilona Ghee, and related wellness products as an authorized partner and CNF of Prakvedaa. For privacy, consent, grievance, and data-rights requests, contact hello@buywell.in or +91 9470309006.</p>",
        "<h2>Personal Data We Collect</h2>",
        "<p>Depending on how you use the platform, we may collect identity details, contact details, account credentials, addresses, order history, payment reference details, refund requests, customer support messages, review or comment content, notification preferences, device/browser data, cookie identifiers, analytics events, and fraud-prevention or security logs.</p>",
        "<h2>Why We Process Data</h2>",
        "<p>We process data to create accounts, authenticate users, fulfil orders, deliver products, process refunds, provide customer support, send order and service notifications, maintain website security, prevent misuse, measure traffic, improve products and content, comply with legal obligations, and manage customer consent and preferences.</p>",
        "<h2>DPDP Notice and Consent</h2>",
        "<p>For Indian users, we process digital personal data for lawful purposes connected with the services you request, including purchase fulfilment, support, notifications, security, analytics where configured, and compliance. Where consent is used, it should be specific, informed, clear, and capable of withdrawal through the contact and preference paths we provide.</p>",
        "<h2>GDPR Readiness Basis</h2>",
        "<p>Where GDPR applies, our processing may rely on contract performance, consent, legal obligation, legitimate interests such as platform security and service improvement, or another applicable lawful basis. You may request information about the basis used for a specific processing activity.</p>",
        "<h2>Sharing and Processors</h2>",
        "<p>We may share data with delivery partners, payment providers, notification providers, analytics tools, hosting infrastructure, security services, professional advisers, and authorities where legally required. Service providers are expected to process data only for instructed purposes and with suitable safeguards.</p>",
        "<h2>Retention</h2>",
        "<p>We keep personal data only as long as reasonably needed for the purpose collected, customer relationship, support, fraud prevention, tax/accounting records, legal claims, or applicable law. When the purpose is no longer served and retention is not legally required, records should be deleted, anonymized, or restricted according to operational capability.</p>",
        "<h2>Security</h2>",
        "<p>We use technical and organizational safeguards such as authentication, role-based admin access, encrypted sensitive configuration, logging, access controls, and operational review. No online service can guarantee absolute security, but we work to prevent unauthorized access, disclosure, alteration, loss, or misuse.</p>",
        "<h2>Your Rights</h2>",
        "<p>Depending on your location and applicable law, you may request access, correction, completion, deletion, grievance redressal, consent withdrawal, portability, restriction, objection, or information about processing. We may need to verify identity before acting on a request, and some rights may be limited by legal, safety, fraud-prevention, or transaction-completion requirements.</p>",
        "<h2>Children</h2>",
        "<p>Our ecommerce services are intended for users who can lawfully enter transactions. We do not knowingly target children with behavioural advertising. If a parent or lawful guardian believes a child has provided personal data, they may contact us for review.</p>",
        "<h2>Updates</h2>",
        "<p>We may update this policy as the platform, law, analytics configuration, or business operations change. The latest version will be published here.</p>",
      ].join(""),
    },
    {
      title: "Data Protection and Consent Policy",
      slug: "data-protection-consent-policy",
      policyType: "data_protection",
      moduleKey: "core",
      excerpt: "How BuyWell Marketplace handles consent, DPDP/GDPR data rights, grievance intake, retention, and breach readiness.",
      content: [
        "<p><strong>Last reviewed:</strong> 2 June 2026</p>",
        "<p>This policy supplements the Privacy Policy and describes how BuyWell Marketplace manages consent, data-rights requests, grievance intake, security evidence, and breach-response readiness for DPDP and GDPR compliance operations.</p>",
        "<h2>Consent Management</h2>",
        "<p>Consent requests should describe the personal data involved, the purpose of processing, and the way a user can withdraw consent. Withdrawal requests can be sent to hello@buywell.in. Withdrawal does not affect processing already completed before withdrawal and may affect our ability to provide requested services that require the data.</p>",
        "<h2>Data-Rights Request Workflow</h2>",
        "<p>Users may request access, correction, completion, update, deletion, withdrawal, grievance support, and, where GDPR applies, portability, restriction, objection, or review of automated decisions. BuyWell Marketplace should verify identity, record the request, assign an owner, assess legal exceptions, respond within the applicable timeline, and keep evidence in the admin compliance panel.</p>",
        "<h2>Grievance Redressal</h2>",
        "<p>Privacy grievances should include the user name, contact detail, order number if relevant, request type, and supporting context. The support owner should acknowledge, investigate, resolve or escalate, and record the outcome. Users may also use statutory complaint channels where applicable.</p>",
        "<h2>Breach Readiness</h2>",
        "<p>A suspected personal data breach should be escalated immediately to the admin owner. The response should identify affected systems, data categories, users, containment steps, processor involvement, notification obligations, user impact, and corrective action. Evidence should be tracked in the compliance panel.</p>",
        "<h2>Retention and Deletion</h2>",
        "<p>Data should be retained only for service, legal, accounting, support, fraud-prevention, security, or dispute-resolution needs. Deletion requests should be assessed against active orders, refunds, tax records, chargeback risk, and legal holds before fulfilment.</p>",
        "<h2>Processor and Vendor Review</h2>",
        "<p>Processors such as hosting, payment, delivery, email, SMS, WhatsApp, analytics, and storage providers should be reviewed for purpose limitation, access control, security, retention, and incident support before production use.</p>",
      ].join(""),
    },
    {
      title: "Refund Policy",
      slug: "refund-policy",
      policyType: "refund",
      moduleKey: "ecommerce",
      excerpt: "Refund eligibility, review, approval, and processing timelines.",
      content: [
        "<p><strong>Last reviewed:</strong> 2 June 2026</p>",
        "<p>BuyWell Marketplace wants every customer to receive authentic, safe, and properly packed natural products. Refunds are reviewed through the ecommerce refund workflow against order status, payment confirmation, product condition, delivery evidence, and customer notes.</p>",
        "<h2>Eligible Refund Situations</h2>",
        "<p>A refund may be considered if the order was prepaid but cancelled before dispatch, the product was unavailable, the wrong product was delivered, the package was damaged in transit, the product arrived unusable, duplicate payment was confirmed, or the support team approves a refund after investigation.</p>",
        "<h2>Non-Refundable Situations</h2>",
        "<p>Refunds may be declined where a consumable product has been opened or consumed without verified defect, damage occurred after delivery, storage instructions were not followed, the request is outside the support window, evidence is insufficient, or the issue is caused by incorrect customer information.</p>",
        "<h2>How to Request</h2>",
        "<p>Members can submit refund requests from order details where enabled or contact support with order number, product name, issue description, photos/video of packaging and product, delivery date, and preferred resolution.</p>",
        "<h2>Review and Processing</h2>",
        "<p>Approved refunds are processed to the original payment method or another approved route according to payment provider capability. Bank, gateway, and settlement timelines may vary. Refund status is visible to admins in the refund workflow.</p>",
      ].join(""),
    },
    {
      title: "Shipping Policy",
      slug: "shipping-policy",
      policyType: "shipping",
      moduleKey: "ecommerce",
      excerpt: "Shipping coverage, charges, tracking, and delivery estimates.",
      content: [
        "<p><strong>Last reviewed:</strong> 2 June 2026</p>",
        "<p>BuyWell Marketplace ships eligible honey, A2 Bilona Ghee, samples, and natural products to serviceable areas using available courier and fulfilment partners.</p>",
        "<h2>Dispatch and Delivery</h2>",
        "<p>Dispatch timelines depend on stock, payment confirmation, packaging readiness, courier pickup, holidays, weather, and serviceability. Estimated delivery timelines shown during checkout or support communication are indicative and may change due to courier or regional conditions.</p>",
        "<h2>Shipping Fees</h2>",
        "<p>Shipping charges, free-shipping thresholds, COD availability, and special handling fees may vary by order value, location, courier, product weight, and campaign rules. Final charges are shown before order confirmation where ecommerce checkout is enabled.</p>",
        "<h2>Tracking and Failed Delivery</h2>",
        "<p>Tracking details may be sent by email, SMS, WhatsApp, or displayed in order details when available. Customers must provide complete address and reachable phone number. Failed delivery due to incorrect address, unavailable recipient, or repeated failed attempts may require re-shipping fees.</p>",
        "<h2>Damaged or Missing Items</h2>",
        "<p>If a shipment arrives damaged, leaking, broken, or incomplete, contact support promptly with order number and photos/video of the outer package, label, inner packaging, and product condition.</p>",
      ].join(""),
    },
    {
      title: "Cookie Policy",
      slug: "cookie-policy",
      policyType: "cookie",
      moduleKey: "seo",
      excerpt: "Cookies and analytics technologies used on the website.",
      content: [
        "<p><strong>Last reviewed:</strong> 2 June 2026</p>",
        "<p>This Cookie Policy explains how BuyWell Marketplace may use cookies, local storage, pixels, tags, analytics scripts, and similar technologies to operate the website, keep users signed in, protect sessions, remember preferences, understand traffic, and improve content.</p>",
        "<h2>Cookie Types</h2>",
        "<p><strong>Essential cookies</strong> support login, cart, checkout, security, and admin functions. <strong>Analytics cookies or tags</strong> help measure page traffic, campaign performance, and user journeys where configured. <strong>Marketing tags</strong> may support remarketing or conversion measurement only when enabled by admins.</p>",
        "<h2>Google Tag Manager and Analytics</h2>",
        "<p>The SEO module can store Google Tag Manager and analytics-related settings. If enabled, third-party scripts may set their own cookies subject to their provider terms. Admins should enable only the tools that match the published privacy and consent approach.</p>",
        "<h2>Managing Cookies</h2>",
        "<p>You can block or delete cookies through browser settings. Some essential features, including login, cart, checkout, and admin functions, may not work correctly if essential storage is disabled.</p>",
        "<h2>Updates</h2>",
        "<p>We may update this policy when analytics providers, tag settings, cookie categories, or consent controls change.</p>",
      ].join(""),
    },
    {
      title: "Return and Replacement Policy",
      slug: "return-replacement-policy",
      policyType: "returns",
      moduleKey: "ecommerce",
      excerpt: "Return and replacement conditions for damaged, wrong, defective, or unsafe deliveries.",
      content: [
        "<p><strong>Last reviewed:</strong> 2 June 2026</p>",
        "<p>Because BuyWell Marketplace sells consumable natural products, returns and replacements are handled carefully for customer safety, product integrity, and hygiene.</p>",
        "<h2>Replacement Eligibility</h2>",
        "<p>Replacement may be approved for wrong item delivered, damaged jar or bottle, leakage in transit, missing item, verified manufacturing or packing defect, or other support-approved issue. Evidence such as package photos, product photos, unboxing video, invoice, and order number may be required.</p>",
        "<h2>Return Restrictions</h2>",
        "<p>Opened, consumed, tampered, improperly stored, or customer-damaged consumables may not be returnable unless a verified defect or safety issue is established. Natural crystallization of raw honey is not a defect.</p>",
        "<h2>Return Pickup or Self-Ship</h2>",
        "<p>Where return pickup is available, support will provide instructions. If self-shipping is approved, the item must be packed securely to avoid leakage or breakage. Refund or replacement decisions may be made after inspection.</p>",
      ].join(""),
    },
    {
      title: "Cancellation Policy",
      slug: "cancellation-policy",
      policyType: "cancellation",
      moduleKey: "ecommerce",
      excerpt: "Order cancellation rules before dispatch, after dispatch, and for unavailable products.",
      content: [
        "<p><strong>Last reviewed:</strong> 2 June 2026</p>",
        "<p>Customers may request cancellation before dispatch by contacting BuyWell Marketplace support with the order number. Once the order is packed, dispatched, or handed to courier, cancellation may no longer be possible and the refund or return workflow may apply instead.</p>",
        "<h2>Pre-Dispatch Cancellation</h2>",
        "<p>If cancellation is accepted before dispatch, prepaid amounts are refunded through the approved refund route after payment verification.</p>",
        "<h2>Post-Dispatch Orders</h2>",
        "<p>For dispatched orders, customers should wait for delivery and then follow the refund, return, or replacement policy if eligible. Courier return-to-origin charges may apply where delivery fails due to incorrect address or recipient unavailability.</p>",
        "<h2>Cancellation by BuyWell Marketplace</h2>",
        "<p>We may cancel orders due to product unavailability, payment failure, serviceability limits, suspected fraud, listing error, operational constraints, or legal restriction. Approved prepaid cancellations are refunded.</p>",
      ].join(""),
    },
  ];

  const policyPageIds = new Map<string, string>();
  for (const page of policyPages) {
    await db.insert(cmsPages).values({
      title: page.title,
      slug: page.slug,
      excerpt: page.excerpt,
      content: page.content,
      status: "published",
      template: "policy",
      moduleKey: page.moduleKey,
      policyType: page.policyType,
      metaTitle: page.title,
      metaDescription: page.excerpt,
      publishedAt: new Date(),
    }).onConflictDoNothing();
    const [saved] = await db.select().from(cmsPages).where(eq(cmsPages.slug, page.slug)).limit(1);
    if (saved) {
      policyPageIds.set(page.policyType, saved.id);
      if (shouldRefreshSeededPolicy(saved.content)) {
        await db.update(cmsPages).set({
          title: page.title,
          excerpt: page.excerpt,
          content: page.content,
          status: "published",
          template: "policy",
          moduleKey: page.moduleKey,
          policyType: page.policyType,
          metaTitle: page.title,
          metaDescription: page.excerpt,
          updatedAt: new Date(),
        }).where(eq(cmsPages.id, saved.id));
      }
    }
  }
  console.log(`✓ ${policyPages.length} policy CMS pages ensured`);

  // ── CMS menus ──────────────────────────────────────────────────────────────
  const defaultMenus: Array<{ menuKey: string; label: string; items: SeedMenuItem[] }> = [
    {
      menuKey: "landing_header",
      label: "Landing Page Header",
      items: [
        { label: "Shop", href: "/shop", itemType: "shop_index", sortOrder: 1 },
        { label: "Blog", href: "/blog", itemType: "blog_index", sortOrder: 2 },
        { label: "Promise", href: "/#promise", itemType: "landing_anchor", sortOrder: 3 },
        { label: "Policies", href: "/privacy-policy", itemType: "cms_page", policyType: "privacy", sortOrder: 4 },
        { label: "Terms", href: "/terms-and-conditions", itemType: "cms_page", policyType: "terms", parentLabel: "Policies", sortOrder: 5 },
        { label: "Data Protection", href: "/data-protection-consent-policy", itemType: "cms_page", policyType: "data_protection", parentLabel: "Policies", sortOrder: 6 },
        { label: "Refunds", href: "/refund-policy", itemType: "cms_page", policyType: "refund", parentLabel: "Policies", sortOrder: 7 },
        { label: "Shipping", href: "/shipping-policy", itemType: "cms_page", policyType: "shipping", parentLabel: "Policies", sortOrder: 8 },
        { label: "Contact", href: "/#contact", itemType: "landing_anchor", sortOrder: 9 },
      ],
    },
    {
      menuKey: "site_header",
      label: "Other Pages Header",
      items: [
        { label: "Home", href: "/", itemType: "landing_anchor", sortOrder: 1 },
        { label: "Shop", href: "/shop", itemType: "shop_index", sortOrder: 2 },
        { label: "Blog", href: "/blog", itemType: "blog_index", sortOrder: 3 },
        { label: "Policies", href: "/privacy-policy", itemType: "cms_page", policyType: "privacy", sortOrder: 4 },
        { label: "Terms", href: "/terms-and-conditions", itemType: "cms_page", policyType: "terms", parentLabel: "Policies", sortOrder: 5 },
        { label: "Data Protection", href: "/data-protection-consent-policy", itemType: "cms_page", policyType: "data_protection", parentLabel: "Policies", sortOrder: 6 },
        { label: "Returns", href: "/return-replacement-policy", itemType: "cms_page", policyType: "returns", parentLabel: "Policies", sortOrder: 7 },
        { label: "Refunds", href: "/refund-policy", itemType: "cms_page", policyType: "refund", parentLabel: "Policies", sortOrder: 8 },
        { label: "Contact", href: "/#contact", itemType: "landing_anchor", sortOrder: 9 },
      ],
    },
    {
      menuKey: "footer",
      label: "Footer Menu",
      items: [
        { label: "Blog", href: "/blog", itemType: "blog_index", sortOrder: 1 },
        { label: "Our Promise", href: "/#promise", itemType: "landing_anchor", sortOrder: 2 },
        { label: "Community", href: "/#gallery", itemType: "landing_anchor", sortOrder: 3 },
        { label: "Policies", href: "/privacy-policy", itemType: "cms_page", policyType: "privacy", sortOrder: 4 },
        { label: "Terms and Conditions", href: "/terms-and-conditions", itemType: "cms_page", policyType: "terms", parentLabel: "Policies", sortOrder: 5 },
        { label: "Data Protection", href: "/data-protection-consent-policy", itemType: "cms_page", policyType: "data_protection", parentLabel: "Policies", sortOrder: 6 },
        { label: "Cookie Policy", href: "/cookie-policy", itemType: "cms_page", policyType: "cookie", parentLabel: "Policies", sortOrder: 7 },
        { label: "Refund Policy", href: "/refund-policy", itemType: "cms_page", policyType: "refund", parentLabel: "Policies", sortOrder: 8 },
        { label: "Return and Replacement", href: "/return-replacement-policy", itemType: "cms_page", policyType: "returns", parentLabel: "Policies", sortOrder: 9 },
        { label: "Cancellation Policy", href: "/cancellation-policy", itemType: "cms_page", policyType: "cancellation", parentLabel: "Policies", sortOrder: 10 },
        { label: "Shipping Policy", href: "/shipping-policy", itemType: "cms_page", policyType: "shipping", parentLabel: "Policies", sortOrder: 11 },
        { label: "Free Sample", href: "/#contact", itemType: "landing_anchor", sortOrder: 12 },
      ],
    },
  ];

  for (const menuData of defaultMenus) {
    await db.insert(cmsMenus).values({
      menuKey: menuData.menuKey,
      label: menuData.label,
    }).onConflictDoNothing();

    const [menu] = await db.select().from(cmsMenus).where(eq(cmsMenus.menuKey, menuData.menuKey)).limit(1);
    if (!menu) continue;

    const existing = await db.select().from(cmsMenuItems).where(eq(cmsMenuItems.menuId, menu.id));
    const parentIds = new Map<string, string>();
    for (const item of existing.filter((item) => !item.parentItemId)) {
      parentIds.set(item.label, item.id);
    }

    let insertedCount = 0;
    for (const item of menuData.items.filter((item) => !("parentLabel" in item))) {
      const existingItem = existing.find((row) => !row.parentItemId && row.label === item.label && row.href === item.href);
      if (existingItem) {
        parentIds.set(item.label, existingItem.id);
        continue;
      }
      const [inserted] = await db.insert(cmsMenuItems).values(menuItemValues(menu.id, item, policyPageIds, null)).returning({ id: cmsMenuItems.id });
      parentIds.set(item.label, inserted.id);
      insertedCount += 1;
    }
    for (const item of menuData.items.filter((item): item is SeedMenuItem & { parentLabel: string } => "parentLabel" in item && typeof item.parentLabel === "string")) {
      const parentId = parentIds.get(item.parentLabel);
      if (!parentId) continue;
      const existingItem = existing.find((row) => row.parentItemId === parentId && row.label === item.label && row.href === item.href);
      if (existingItem) continue;
      await db.insert(cmsMenuItems).values(menuItemValues(menu.id, item, policyPageIds, parentId));
      insertedCount += 1;
    }
    console.log(insertedCount > 0
      ? `✓ ${menuData.label} seeded with ${insertedCount} missing items`
      : `○ ${menuData.label} already has seeded menu items`);
  }

  const complianceItems = [
    {
      complianceKey: "gdpr",
      moduleKey: "core",
      parameterKey: "transparent_notice",
      title: "Transparent privacy notice",
      description: "Privacy information is published in clear language, names BuyWell Marketplace contact details, and is reachable from nested public policy menus.",
      status: "partial",
      policyType: "privacy",
      evidence: "Privacy Policy page seeded with DPDP/GDPR-ready notice; legal owner should approve final publication wording.",
    },
    {
      complianceKey: "gdpr",
      moduleKey: "core",
      parameterKey: "lawful_basis_register",
      title: "Lawful basis and processing purpose register",
      description: "Each processing activity should identify contract, consent, legal obligation, legitimate interest, or another applicable basis.",
      status: "partial",
      policyType: "privacy",
      evidence: "Privacy Policy describes typical lawful bases; maintain activity-level evidence in admin compliance notes.",
    },
    {
      complianceKey: "gdpr",
      moduleKey: "core",
      parameterKey: "data_subject_requests",
      title: "Data subject request handling",
      description: "Admin process covers access, rectification, erasure, restriction, portability, objection, and automated-decision review requests.",
      status: "partial",
      policyType: "data_protection",
      evidence: "Data Protection and Consent Policy defines intake workflow; connect request intake to support operations.",
    },
    {
      complianceKey: "gdpr",
      moduleKey: "seo",
      parameterKey: "analytics_consent",
      title: "Analytics and tag transparency",
      description: "Analytics, Google Tag Manager, and cookie/tag use are documented and controlled from the SEO module.",
      status: "partial",
      policyType: "cookie",
      evidence: "SEO analytics settings and Cookie Policy page are available.",
    },
    {
      complianceKey: "gdpr",
      moduleKey: "core",
      parameterKey: "retention_minimisation",
      title: "Data minimisation and retention",
      description: "Personal data should be limited to service purposes and retained only while needed for business, legal, security, or dispute requirements.",
      status: "partial",
      policyType: "privacy",
      evidence: "Privacy Policy includes retention language; operational retention jobs and deletion evidence should be maintained.",
    },
    {
      complianceKey: "gdpr",
      moduleKey: "core",
      parameterKey: "processor_governance",
      title: "Processor and vendor governance",
      description: "Hosting, payment, courier, email, SMS, WhatsApp, media, and analytics processors should be reviewed for purpose limitation and safeguards.",
      status: "partial",
      policyType: "data_protection",
      evidence: "Vendor review requirement is published; add processor contracts and review dates as evidence.",
    },
    {
      complianceKey: "gdpr",
      moduleKey: "core",
      parameterKey: "security_measures",
      title: "Security measures",
      description: "Role-based access, encrypted secrets, authentication, logging, and operational safeguards are tracked.",
      status: "partial",
      policyType: "data_protection",
      evidence: "Application has role-based admin controls and encrypted config; complete infra evidence and review cadence.",
    },
    {
      complianceKey: "gdpr",
      moduleKey: "core",
      parameterKey: "breach_notification",
      title: "Breach response tracking",
      description: "Internal evidence records cover breach response ownership and notification readiness.",
      status: "partial",
      policyType: "data_protection",
      evidence: "Data Protection and Consent Policy includes breach readiness; assign owner, escalation timeline, and drill evidence.",
    },
    {
      complianceKey: "gdpr",
      moduleKey: "core",
      parameterKey: "cross_border_transfer_review",
      title: "Cross-border transfer review",
      description: "Any overseas hosting, analytics, notification, or payment processing should be assessed before enablement.",
      status: "partial",
      policyType: "privacy",
      evidence: "Policy describes processors; admin must document transfer safeguards for enabled vendors.",
    },
    {
      complianceKey: "dpdp",
      moduleKey: "core",
      parameterKey: "lawful_purpose_notice",
      title: "Lawful purpose and notice",
      description: "Data processing notice states lawful purpose, requested data, and user rights.",
      status: "partial",
      policyType: "privacy",
      evidence: "Privacy Policy includes lawful purpose, contact path, data categories, and rights summary.",
    },
    {
      complianceKey: "dpdp",
      moduleKey: "core",
      parameterKey: "clear_consent",
      title: "Clear consent request",
      description: "Consent should be free, specific, informed, unambiguous, clear, and tied to the specified purpose.",
      status: "partial",
      policyType: "data_protection",
      evidence: "Consent requirements are published; confirm all production consent UI copy and storage evidence.",
    },
    {
      complianceKey: "dpdp",
      moduleKey: "core",
      parameterKey: "consent_withdrawal",
      title: "Consent withdrawal and grievance path",
      description: "Users can identify how to withdraw consent and raise grievances.",
      status: "partial",
      policyType: "data_protection",
      evidence: "Data Protection and Consent Policy gives withdrawal and grievance contact path.",
    },
    {
      complianceKey: "dpdp",
      moduleKey: "core",
      parameterKey: "security_safeguards",
      title: "Reasonable security safeguards",
      description: "Admin records security safeguards and evidence for personal data protection.",
      status: "partial",
      policyType: "data_protection",
      evidence: "Authentication, admin gating, and encrypted config exist; complete operational evidence.",
    },
    {
      complianceKey: "dpdp",
      moduleKey: "core",
      parameterKey: "breach_intimation",
      title: "Personal data breach intimation readiness",
      description: "Breach workflow should identify affected Data Principals, Board intimation needs, containment, and remediation.",
      status: "partial",
      policyType: "data_protection",
      evidence: "Policy defines breach escalation; add incident owner, templates, and drill results.",
    },
    {
      complianceKey: "dpdp",
      moduleKey: "core",
      parameterKey: "erasure_when_purpose_served",
      title: "Erasure when purpose is served",
      description: "Personal data should be erased when consent is withdrawn or purpose no longer applies unless retention is legally required.",
      status: "partial",
      policyType: "privacy",
      evidence: "Privacy Policy includes retention/erasure language; schedule operational deletion review.",
    },
    {
      complianceKey: "dpdp",
      moduleKey: "core",
      parameterKey: "data_processor_controls",
      title: "Data processor controls",
      description: "Processors should handle personal data only on instructed purposes with appropriate safeguards.",
      status: "partial",
      policyType: "data_protection",
      evidence: "Vendor review requirement published; upload processor contracts/evidence in admin notes.",
    },
    {
      complianceKey: "dpdp",
      moduleKey: "core",
      parameterKey: "children_data_safeguards",
      title: "Children's data safeguards",
      description: "The platform should avoid behavioural targeting of children and require guardian review where children data is knowingly processed.",
      status: "partial",
      policyType: "privacy",
      evidence: "Privacy Policy includes children section; confirm production flows do not target children.",
    },
    {
      complianceKey: "dpdp",
      moduleKey: "ecommerce",
      parameterKey: "order_data_minimisation",
      title: "Order data minimisation",
      description: "Ecommerce data collection is limited to fulfilment, payment verification, and support.",
      status: "partial",
      policyType: "terms",
      evidence: "Order/refund workflows collect purpose-specific fields.",
    },
  ];

  for (const item of complianceItems) {
    const [existingCheck] = await db.select().from(complianceChecks)
      .where(and(eq(complianceChecks.complianceKey, item.complianceKey), eq(complianceChecks.parameterKey, item.parameterKey)))
      .limit(1);
    const values = {
      complianceKey: item.complianceKey,
      moduleKey: item.moduleKey,
      parameterKey: item.parameterKey,
      title: item.title,
      description: item.description,
      status: item.status,
      evidence: item.evidence,
      policyPageId: policyPageIds.get(item.policyType) ?? null,
      updatedAt: new Date(),
    };
    if (existingCheck) {
      await db.update(complianceChecks).set(values).where(eq(complianceChecks.id, existingCheck.id));
    } else {
      await db.insert(complianceChecks).values(values);
    }
  }
  console.log(`✓ ${complianceItems.length} compliance checklist items ensured`);

  const { cacheInvalidate } = await import("../cache");
  await Promise.all([
    cacheInvalidate.cms(),
    cacheInvalidate.cmsPages(),
    cacheInvalidate.menus(),
  ]);
  console.log("✓ CMS page and menu caches invalidated");
  const { redis } = await import("../redis");
  (redis as { disconnect?: () => void }).disconnect?.();
  if (global.__redisClient === redis) global.__redisClient = undefined;

  console.log("\n✅ Seed complete!");
  await pool.end();
}

function shouldRefreshSeededPolicy(content: string | null): boolean {
  const value = content ?? "";
  return value.length < 700
    || value.includes("Administrators should review")
    || value.includes("baseline language")
    || value.includes("contact pathway placeholder");
}

function menuItemValues(
  menuId: string,
  item: SeedMenuItem,
  policyPageIds: Map<string, string>,
  parentItemId: string | null,
) {
  const pageId = item.itemType === "cms_page" && item.policyType
    ? policyPageIds.get(item.policyType) ?? null
    : null;
  return {
    menuId,
    label: item.label,
    href: item.href,
    itemType: item.itemType,
    pageId,
    blogPostId: null,
    productId: null,
    parentItemId,
    opensNewTab: item.opensNewTab === true,
    isEnabled: true,
    sortOrder: item.sortOrder,
  };
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
