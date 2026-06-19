"use client";
import React, { useRef, useState } from "react";
import Link from "next/link";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { HomeHeroSlider, type HeroBanner } from "@/components/shop/HomeHeroSlider";
import styles from "./homepage.module.css";

interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
  color?: string | null;
  description?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  productCount?: number;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  category: string;
  categoryName?: string | null;
  description: string | null;
  imageUrl: string | null | undefined;
  priceMin?: number;
  isNew?: boolean;
}

interface Testimonial {
  id: string;
  name: string;
  content: string;
  mediaUrl: string | null;
  mediaType: string | null;
}

interface HomepageClientProps {
  heroBanners: HeroBanner[];
  promoBanners: HeroBanner[];
  categories: Category[];
  featuredProducts: Product[];
  latestProducts: Product[];
  testimonials: Testimonial[];
}

// Comprehensive icon map for all 13 Indian e-commerce top-level categories + subcategories
const CATEGORY_ICONS: Record<string, string> = {
  // Food & Grocery
  "food":        "🥘",
  "grocery":     "🛒",
  "honey":       "🍯",
  "ghee":        "🧈",
  "butter":      "🧈",
  "spice":       "🌶️",
  "masala":      "🌶️",
  "oil":         "🫙",
  "snack":       "🍿",
  "namkeen":     "🍿",
  "beverage":    "🍵",
  "tea":         "🍵",
  "coffee":      "☕",
  "juice":       "🧃",
  "grain":       "🌾",
  "rice":        "🍚",
  "millet":      "🌾",
  "cereal":      "🥣",
  "flour":       "🌾",
  "pulse":       "🫘",
  "lentil":      "🫘",
  "jaggery":     "🍬",
  "sugar":       "🍬",
  "salt":        "🧂",
  "dairy":       "🥛",
  "egg":         "🥚",
  "pickle":      "🫙",
  "jam":         "🍓",
  "sauce":       "🫙",
  "condiment":   "🫙",
  "bakery":      "🥖",
  "bread":       "🍞",
  "dry fruit":   "🥜",
  "nut":         "🥜",
  "protein":     "💪",
  // Ayurveda & Herbal
  "ayurveda":    "🌿",
  "herbal":      "🌿",
  "medicine":    "💊",
  "tonic":       "🍶",
  "immunity":    "🛡️",
  "digestive":   "🫁",
  "liver":       "💊",
  "diabetic":    "💊",
  "pain":        "🩹",
  "joint":       "🦴",
  "supplement":  "💊",
  "essential oil":"🌸",
  "extract":     "🌸",
  "kadha":       "🍵",
  "stress":      "🧘",
  "sleep":       "😴",
  "weight":      "⚖️",
  // Personal Care & Beauty
  "personal care":"✨",
  "beauty":      "✨",
  "hair oil":    "💆",
  "serum":       "💆",
  "shampoo":     "🧴",
  "conditioner": "🧴",
  "hair color":  "🎨",
  "hair":        "💆",
  "face wash":   "🧼",
  "moisturis":   "🧴",
  "skin":        "✨",
  "cosmetic":    "💄",
  "lipstick":    "💄",
  "perfume":     "🌹",
  "deodorant":   "🌹",
  "soap":        "🧼",
  "cream":       "🧴",
  // Home & Living
  "home":        "🏠",
  "living":      "🛋️",
  "kitchen":     "🍳",
  "cookware":    "🍳",
  "bedding":     "🛏️",
  "furniture":   "🪑",
  "lighting":    "💡",
  "cleaning":    "🧹",
  "storage":     "📦",
  "decor":       "🖼️",
  // Baby & Kids
  "baby":        "🍼",
  "kid":         "🧒",
  "toddler":     "🧒",
  "infant":      "👶",
  "diaper":      "🍼",
  "toy":         "🧸",
  "stroller":    "🛒",
  // Electronics
  "electronic":  "📱",
  "phone":       "📱",
  "mobile":      "📱",
  "laptop":      "💻",
  "computer":    "💻",
  "tablet":      "📟",
  "gadget":      "🔌",
  "camera":      "📷",
  "tv":          "📺",
  "audio":       "🎵",
  "headphone":   "🎧",
  "earphone":    "🎧",
  "charger":     "🔌",
  "accessory":   "🔌",
  // Fashion & Clothing
  "fashion":     "👗",
  "clothing":    "👕",
  "ethnic":      "👘",
  "saree":       "👘",
  "kurta":       "👘",
  "shirt":       "👔",
  "trouser":     "👖",
  "dress":       "👗",
  "jeans":       "👖",
  "footwear":    "👟",
  "shoe":        "👟",
  "sandal":      "🩴",
  "bag":         "👜",
  "wallet":      "👛",
  "watch":       "⌚",
  "sunglass":    "🕶️",
  // Books & Stationery
  "book":        "📚",
  "stationery":  "✏️",
  "pen":         "🖊️",
  "notebook":    "📓",
  "art":         "🎨",
  "craft":       "✂️",
  // Sports & Fitness
  "sport":       "⚽",
  "fitness":     "💪",
  "gym":         "🏋️",
  "yoga":        "🧘",
  "cycling":     "🚴",
  "cricket":     "🏏",
  "badminton":   "🏸",
  "outdoor":     "🏕️",
  "trekking":    "🏔️",
  // Agriculture & Gardening
  "agriculture": "🌱",
  "garden":      "🌻",
  "plant":       "🪴",
  "seed":        "🌱",
  "fertilizer":  "🌿",
  "farming":     "🌾",
  // Jewellery & Accessories
  "jewellery":   "💍",
  "jewelry":     "💍",
  "ring":        "💍",
  "necklace":    "📿",
  "bracelet":    "📿",
  "earring":     "👂",
  "silver":      "🥈",
  "gold":        "🥇",
  // Pet Care
  "pet":         "🐾",
  "dog":         "🐶",
  "cat":         "🐱",
  "bird":        "🐦",
  "aquarium":    "🐠",
  // Office Supplies
  "office":      "🗂️",
  "printer":     "🖨️",
  "file":        "📁",
  "organiser":   "📂",
  // Generic fallbacks
  "womens":      "👗",
  "mens":        "👔",
  "other":       "📦",
};

const HERO_CATEGORY_LIMIT = 8;

function getCategoryIcon(name: string, icon?: string | null): string {
  if (icon) return icon;
  const nameLower = name.toLowerCase();
  // Try full phrase matches first (longer keys win)
  const sortedKeys = Object.keys(CATEGORY_ICONS).sort((a, b) => b.length - a.length);
  for (const k of sortedKeys) {
    if (nameLower.includes(k)) return CATEGORY_ICONS[k];
  }
  return "🛍️";
}

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
};

const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.5 } },
};

const TRUST_BADGES = [
  { icon: "🛡️", label: "Verified Sellers" },
  { icon: "🚚", label: "Pan-India Delivery" },
  { icon: "🔒", label: "Secure Payments" },
  { icon: "↩️", label: "Easy Returns" },
  { icon: "⭐", label: "Curated Products" },
  { icon: "💰", label: "Best Prices" },
];

const FEATURES = [
  { icon: "✅", title: "Verified Sellers", desc: "Every vendor is background-checked and approved before listing products on BuyWell." },
  { icon: "🚚", title: "Pan-India Delivery", desc: "Fast, tracked shipping to all 28 states and 8 union territories across India." },
  { icon: "🔒", title: "Secure Payments", desc: "All transactions are encrypted and protected. Pay confidently with Razorpay or bank transfer." },
  { icon: "↩️", title: "Easy Returns", desc: "Hassle-free returns within 7 days. No questions asked for eligible products." },
  { icon: "📞", title: "Dedicated Support", desc: "Real humans ready to assist you via WhatsApp, email, or phone — 9 AM to 9 PM IST." },
  { icon: "🌿", title: "Quality Guaranteed", desc: "Strict quality checks ensure every product meets our standards before it reaches you." },
];

function AnimatedSection({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.section
      ref={ref}
      className={className}
      initial="hidden"
      animate={inView ? "show" : "hidden"}
      variants={staggerContainer}
    >
      {children}
    </motion.section>
  );
}

function HomepageProductCard({ product: p }: { product: Product }) {
  return (
    <Link href={`/shop/${p.slug}`} style={{ textDecoration: "none", display: "block", height: "100%" }}>
      <div className={styles.productCard}>
        <div className={styles.productCardImg}>
          {p.imageUrl ? (
            <img src={p.imageUrl} alt={p.name} loading="lazy" />
          ) : (
            <div className={styles.productCardImgFallback}>🛍️</div>
          )}
        </div>
        <div className={styles.productCardBody}>
          <p className={styles.productCardCategory}>{p.categoryName ?? p.category}</p>
          <h3 className={styles.productCardName}>{p.name}</h3>
          {p.description && (
            <p className={styles.productCardDesc}>
              {p.description.slice(0, 72)}{p.description.length > 72 ? "…" : ""}
            </p>
          )}
          <span className={styles.productCardCta}>View Product →</span>
        </div>
      </div>
    </Link>
  );
}

export function HomepageClient({
  heroBanners,
  promoBanners,
  categories,
  featuredProducts,
  latestProducts,
  testimonials,
}: HomepageClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [catOpen, setCatOpen] = useState(false);
  const [showAllCats, setShowAllCats] = useState(false);
  const [showAllGridCats, setShowAllGridCats] = useState(false);
  const latestScrollRef = useRef<HTMLDivElement>(null);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/shop?search=${encodeURIComponent(searchQuery.trim())}`;
    }
  }

  function scrollLatest(dir: "left" | "right") {
    const el = latestScrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -300 : 300, behavior: "smooth" });
  }

  return (
    <div className={styles.page}>

      {/* ── 2-Column Hero: Category Sidebar + Slider ── */}
      <section className={styles.heroWrapper}>
        <div className={styles.heroInner}>
        <div className={styles.heroGrid}>

          {/* Left: Category Quick Links */}
          <div className={styles.heroCategoryPanel}>
            <button
              className={styles.heroCategoryHeader}
              onClick={() => setCatOpen((o) => !o)}
              aria-expanded={catOpen}
            >
              <span className={styles.heroCategoryTitle}>Shop by Category</span>
              <span className={[styles.heroCatToggle, catOpen ? styles.heroCatToggleOpen : ""].join(" ")} aria-hidden>›</span>
            </button>

            <div className={[styles.heroCategoryBody, catOpen ? styles.heroCategoryBodyOpen : ""].join(" ")}>
              <nav className={styles.heroCategoryList}>
                {(showAllCats ? categories : categories.slice(0, HERO_CATEGORY_LIMIT)).map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/shop?category=${cat.slug}`}
                    className={styles.heroCategoryItem}
                    style={{ "--cat-color": cat.color ?? "#0d7659" } as React.CSSProperties}
                  >
                    <span className={styles.heroCatIcon}>{getCategoryIcon(cat.name, cat.icon ?? null)}</span>
                    <span className={styles.heroCatName}>{cat.name}</span>
                    <span className={styles.heroCatArrow}>›</span>
                  </Link>
                ))}
                {categories.length > HERO_CATEGORY_LIMIT && (
                  <button
                    className={[styles.heroCategoryItem, styles.heroCatShowMore].join(" ")}
                    onClick={() => setShowAllCats((v) => !v)}
                    type="button"
                  >
                    <span className={styles.heroCatIcon}>{showAllCats ? "▲" : "▼"}</span>
                    <span className={styles.heroCatName}>{showAllCats ? "Show Less" : `+${categories.length - HERO_CATEGORY_LIMIT} More`}</span>
                  </button>
                )}
                <Link href="/categories" className={[styles.heroCategoryItem, styles.heroCatAll].join(" ")}>
                  <span className={styles.heroCatIcon}>🗂️</span>
                  <span className={styles.heroCatName}>All Categories</span>
                  <span className={styles.heroCatArrow}>›</span>
                </Link>
              </nav>

              {/* Search bar inside category panel (desktop only) */}
              <div className={styles.heroCatSearch}>
                <form onSubmit={handleSearch} className={styles.heroCatSearchForm}>
                  <span className={styles.heroCatSearchIcon} aria-hidden>🔍</span>
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search products…"
                    className={styles.heroCatSearchInput}
                  />
                </form>
              </div>
            </div>
          </div>

          {/* Right: Hero Slider */}
          <div className={styles.heroSliderPanel}>
            <HomeHeroSlider banners={heroBanners} autoPlayMs={5000} className={styles.heroSlider} />
          </div>
        </div>

        {/* ── Marquee ticker — inside heroInner so it's exactly the same width ── */}
        <div className={styles.marqueeWrap} aria-hidden>
          <div className={styles.marqueeTrack}>
            {[...TRUST_BADGES, ...TRUST_BADGES].map((b, i) => (
              <span key={i} className={styles.marqueeItem}>{b.icon} {b.label}</span>
            ))}
          </div>
        </div>
        </div>
      </section>

      {/* ── Category Grid ── */}
      {categories.length > 0 && (
        <AnimatedSection className={styles.categorySection}>
          <div className={styles.container}>
            <motion.div className={styles.sectionHead} variants={fadeUp}>
              <div>
                <span className={styles.eyebrow}>Browse by category</span>
                <h2 className={styles.sectionTitle}>Shop by Category</h2>
              </div>
              <Link href="/shop" className={styles.viewAll}>All Products →</Link>
            </motion.div>
            <motion.div className={styles.categoryGrid} variants={staggerContainer}>
              {(showAllGridCats ? categories : categories.slice(0, 12)).map((cat) => (
                <motion.div key={cat.id} variants={fadeUp}>
                  <Link
                    href={`/shop?category=${cat.slug}`}
                    className={styles.categoryCard}
                    style={{ "--cat-color": cat.color ?? "#0d7659" } as React.CSSProperties}
                  >
                    <span className={styles.categoryCardIcon}>{getCategoryIcon(cat.name, cat.icon ?? null)}</span>
                    <span className={styles.categoryCardName}>{cat.name}</span>
                  </Link>
                </motion.div>
              ))}
              <motion.div variants={fadeUp}>
                <Link href="/shop" className={[styles.categoryCard, styles.categoryCardAll].join(" ")}>
                  <span className={styles.categoryCardIcon}>🛒</span>
                  <span className={styles.categoryCardName}>All Products</span>
                </Link>
              </motion.div>
            </motion.div>
            {categories.length > 12 && (
              <motion.div className={styles.showMoreWrap} variants={fadeUp}>
                <Link href="/categories" className={styles.showMoreBtn} style={{ textDecoration: "none", display: "inline-flex" }}>
                  ▼ View All {categories.length} Categories
                </Link>
              </motion.div>
            )}
          </div>
        </AnimatedSection>
      )}

      {/* ── Featured Products ── */}
      <AnimatedSection className={styles.section}>
        <div className={styles.container}>
          <motion.div className={styles.sectionHead} variants={fadeUp}>
            <div>
              <span className={styles.eyebrow}>Editor&apos;s picks</span>
              <h2 className={styles.sectionTitle}>Featured Products</h2>
            </div>
            {featuredProducts.length > 0 && (
              <Link href="/shop?featured=true" className={styles.viewAll}>View all →</Link>
            )}
          </motion.div>
          {featuredProducts.length > 0 ? (
            <motion.div className={styles.productGrid} variants={staggerContainer}>
              {featuredProducts.map((p) => (
                <motion.div key={p.id} variants={fadeUp}>
                  <HomepageProductCard product={p} />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div className={styles.emptySection} variants={fadeUp}>
              <span className={styles.emptyIcon}>🛍️</span>
              <p className={styles.emptyText}>No featured products yet.<br />Check back soon — our sellers are adding amazing products!</p>
              <Link href="/shop" className={styles.emptyBtn}>Browse All Products →</Link>
            </motion.div>
          )}
        </div>
      </AnimatedSection>

      {/* ── Promo Banners ── */}
      {promoBanners.length > 0 && (
        <AnimatedSection className={styles.promoRow}>
          <div className={styles.container}>
            <motion.div className={styles.promoGrid} variants={staggerContainer}>
              {promoBanners.slice(0, 2).map((b) => (
                <motion.div key={b.id} variants={fadeUp}>
                  <Link href={b.linkUrl ?? "/shop"} className={styles.promoBanner}>
                    <img src={b.imageUrl} alt={b.title ?? "Promo"} className={styles.promoImg} loading="lazy" />
                    {(b.title || b.linkText) && (
                      <div className={styles.promoCaption}>
                        {b.title && <span className={styles.promoTitle}>{b.title}</span>}
                        {b.linkText && <span className={styles.promoLink}>{b.linkText} →</span>}
                      </div>
                    )}
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </AnimatedSection>
      )}

      {/* ── Latest Products Carousel ── */}
      <AnimatedSection className={styles.section}>
        <div className={styles.container}>
          <motion.div className={styles.sectionHead} variants={fadeUp}>
            <div>
              <span className={styles.eyebrow}>Just arrived</span>
              <h2 className={styles.sectionTitle}>New Arrivals</h2>
            </div>
            {latestProducts.length > 0 && (
              <div className={styles.carouselControls}>
                <button className={styles.carouselBtn} onClick={() => scrollLatest("left")} aria-label="Scroll left">‹</button>
                <button className={styles.carouselBtn} onClick={() => scrollLatest("right")} aria-label="Scroll right">›</button>
                <Link href="/shop" className={styles.viewAll}>View all →</Link>
              </div>
            )}
          </motion.div>
          {latestProducts.length > 0 ? (
            <motion.div className={styles.latestScroll} ref={latestScrollRef} variants={fadeIn}>
              {latestProducts.map((p) => (
                <div key={p.id} className={styles.latestItem}>
                  <HomepageProductCard product={p} />
                </div>
              ))}
            </motion.div>
          ) : (
            <motion.div className={styles.emptySection} variants={fadeUp}>
              <span className={styles.emptyIcon}>📦</span>
              <p className={styles.emptyText}>No products listed yet.<br />Our marketplace is growing — come back soon!</p>
              <Link href="/become-vendor" className={styles.emptyBtn}>Start Selling on BuyWell →</Link>
            </motion.div>
          )}
        </div>
      </AnimatedSection>

      {/* ── Features Grid ── */}
      <AnimatedSection className={styles.featuresSection}>
        <div className={styles.container}>
          <motion.div className={styles.sectionHead} variants={fadeUp}>
            <div>
              <span className={styles.eyebrow}>Why BuyWell</span>
              <h2 className={styles.sectionTitle}>Built for Trust & Convenience</h2>
            </div>
          </motion.div>
          <motion.div className={styles.featuresGrid} variants={staggerContainer}>
            {FEATURES.map((f) => (
              <motion.div key={f.title} className={styles.featureCard} variants={fadeUp}>
                <span className={styles.featureIcon}>{f.icon}</span>
                <h3 className={styles.featureTitle}>{f.title}</h3>
                <p className={styles.featureDesc}>{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </AnimatedSection>

      {/* ── Testimonials ── */}
      {testimonials.length > 0 && (
        <AnimatedSection className={styles.section}>
          <div className={styles.container}>
            <motion.div className={styles.sectionHead} variants={fadeUp}>
              <div>
                <span className={styles.eyebrow}>Happy customers</span>
                <h2 className={styles.sectionTitle}>What People Say</h2>
              </div>
            </motion.div>
            <motion.div className={styles.testimonialGrid} variants={staggerContainer}>
              {testimonials.map((t) => (
                <motion.div key={t.id} className={styles.testimonialCard} variants={fadeUp}>
                  <div className={styles.testimonialStars}>★★★★★</div>
                  <p className={styles.testimonialText}>&ldquo;{t.content}&rdquo;</p>
                  <div className={styles.testimonialAuthor}>
                    {t.mediaUrl && t.mediaType === "image" ? (
                      <img src={t.mediaUrl} alt={t.name} className={styles.testimonialAvatar} />
                    ) : (
                      <div className={styles.testimonialAvatarFallback}>{t.name[0]}</div>
                    )}
                    <span className={styles.testimonialName}>{t.name}</span>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </AnimatedSection>
      )}

      {/* ── Become a Seller CTA ── */}
      <AnimatedSection className={styles.sellerCta}>
        <div className={styles.container}>
          <motion.div className={styles.sellerCtaInner} variants={staggerContainer}>
            <motion.div variants={fadeUp}>
              <h2 className={styles.sellerCtaTitle}>Grow your business with BuyWell</h2>
              <p className={styles.sellerCtaDesc}>Join thousands of sellers across India. List your products, reach millions of customers, and scale your business — all from one platform.</p>
            </motion.div>
            <motion.div variants={fadeUp}>
              <Link href="/become-vendor" className={styles.sellerCtaBtn}>Start Selling Free →</Link>
            </motion.div>
          </motion.div>
        </div>
      </AnimatedSection>

      {/* ── Newsletter ── */}
      <AnimatedSection className={styles.newsletterSection}>
        <div className={styles.container}>
          <motion.div className={styles.newsletterInner} variants={staggerContainer}>
            <motion.div variants={fadeUp}>
              <span className={styles.eyebrow}>Stay in the loop</span>
              <h2 className={styles.newsletterTitle}>Get the Best Deals First</h2>
              <p className={styles.newsletterDesc}>Subscribe for exclusive offers, new arrivals, and seller spotlights — delivered straight to your inbox.</p>
            </motion.div>
            <motion.form
              className={styles.newsletterForm}
              variants={fadeUp}
              onSubmit={(e) => { e.preventDefault(); }}
            >
              <input
                type="email"
                placeholder="Enter your email address"
                className={styles.newsletterInput}
                required
              />
              <button type="submit" className={styles.newsletterBtn}>Subscribe</button>
            </motion.form>
          </motion.div>
        </div>
      </AnimatedSection>
    </div>
  );
}
