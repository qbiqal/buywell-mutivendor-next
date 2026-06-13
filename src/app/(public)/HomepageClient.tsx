"use client";
import React, { useRef, useState } from "react";
import Link from "next/link";
import { HomeHeroSlider, type HeroBanner } from "@/components/shop/HomeHeroSlider";
import styles from "./homepage.module.css";

interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
  color?: string | null;
  productCount?: number;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  category: string;
  subCategory: string | null;
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

function HomepageProductCard({ product: p }: { product: Product }) {
  return (
    <Link href={`/shop/${p.slug}`} style={{ textDecoration: "none", display: "block" }}>
      <div className={styles.productCard}>
        <div className={styles.productCardImg}>
          {p.imageUrl ? (
            <img src={p.imageUrl} alt={p.name} loading="lazy" />
          ) : (
            <div className={styles.productCardImgFallback}>🛍️</div>
          )}
        </div>
        <div className={styles.productCardBody}>
          <p className={styles.productCardCategory}>{p.subCategory ?? p.category}</p>
          <h3 className={styles.productCardName}>{p.name}</h3>
          {p.description && <p className={styles.productCardDesc}>{p.description.slice(0, 80)}{p.description.length > 80 ? "…" : ""}</p>}
          <span className={styles.productCardCta}>View Product →</span>
        </div>
      </div>
    </Link>
  );
}

const CATEGORY_ICONS: Record<string, string> = {
  honey: "🍯", ghee: "🧈", spices: "🌶️", oils: "🫙", snacks: "🍿",
  beverages: "🍵", grains: "🌾", pulses: "🫘", dairy: "🥛", fruits: "🍎",
  vegetables: "🥦", beauty: "✨", health: "💊", clothing: "👕", electronics: "📱",
  home: "🏠", sports: "⚽", books: "📚", toys: "🧸", other: "📦",
};

function getCategoryIcon(name: string, icon?: string | null): string {
  if (icon) return icon;
  const key = name.toLowerCase().replace(/\s+/g, "");
  for (const [k, v] of Object.entries(CATEGORY_ICONS)) {
    if (key.includes(k)) return v;
  }
  return "📦";
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
      {/* ── Hero Banner Slider ── */}
      <section className={styles.heroSection}>
        <HomeHeroSlider banners={heroBanners} autoPlayMs={5000} />
      </section>

      {/* ── Search bar (mobile prominence) ── */}
      <section className={styles.mobileSearch}>
        <div className={styles.container}>
          <form onSubmit={handleSearch} className={styles.searchForm}>
            <span className={styles.searchIcon} aria-hidden>🔍</span>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products, categories, brands…"
              className={styles.searchInput}
            />
            <button type="submit" className={styles.searchBtn}>Search</button>
          </form>
        </div>
      </section>

      {/* ── Category Strip ── */}
      {categories.length > 0 && (
        <section className={styles.categoryStrip}>
          <div className={styles.container}>
            <h2 className={styles.stripTitle}>Shop by Category</h2>
            <div className={styles.categoryScroll}>
              {categories.map((cat) => (
                <Link key={cat.id} href={`/shop?category=${cat.slug}`} className={styles.categoryChip}>
                  <span className={styles.chipIcon}>{getCategoryIcon(cat.name, cat.icon ?? null)}</span>
                  <span className={styles.chipLabel}>{cat.name}</span>
                </Link>
              ))}
              <Link href="/shop" className={[styles.categoryChip, styles.chipAll].join(" ")}>
                <span className={styles.chipIcon}>🛒</span>
                <span className={styles.chipLabel}>All</span>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── Featured Products ── */}
      {featuredProducts.length > 0 && (
        <section className={styles.section}>
          <div className={styles.container}>
            <div className={styles.sectionHead}>
              <div>
                <span className={styles.eyebrow}>Editor&apos;s picks</span>
                <h2 className={styles.sectionTitle}>Featured Products</h2>
              </div>
              <Link href="/shop?featured=true" className={styles.viewAll}>View all →</Link>
            </div>
            <div className={styles.productGrid}>
              {featuredProducts.map((p) => (
                <HomepageProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Promo Banner Row ── */}
      {promoBanners.length > 0 && (
        <section className={styles.promoRow}>
          <div className={styles.container}>
            <div className={styles.promoGrid}>
              {promoBanners.slice(0, 2).map((b) => (
                <Link key={b.id} href={b.linkUrl ?? "/shop"} className={styles.promoBanner}>
                  <img src={b.imageUrl} alt={b.title ?? "Promo"} className={styles.promoImg} loading="lazy" />
                  {(b.title || b.linkText) && (
                    <div className={styles.promoCaption}>
                      {b.title && <span className={styles.promoTitle}>{b.title}</span>}
                      {b.linkText && <span className={styles.promoLink}>{b.linkText} →</span>}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Latest Products Carousel ── */}
      {latestProducts.length > 0 && (
        <section className={styles.section}>
          <div className={styles.container}>
            <div className={styles.sectionHead}>
              <div>
                <span className={styles.eyebrow}>Just arrived</span>
                <h2 className={styles.sectionTitle}>Latest Products</h2>
              </div>
              <div className={styles.carouselControls}>
                <button className={styles.carouselBtn} onClick={() => scrollLatest("left")} aria-label="Scroll left">‹</button>
                <button className={styles.carouselBtn} onClick={() => scrollLatest("right")} aria-label="Scroll right">›</button>
                <Link href="/shop" className={styles.viewAll}>View all →</Link>
              </div>
            </div>
            <div className={styles.latestScroll} ref={latestScrollRef}>
              {latestProducts.map((p) => (
                <div key={p.id} className={styles.latestItem}>
                  <HomepageProductCard product={p} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Trust Badges ── */}
      <section className={styles.trustSection}>
        <div className={styles.container}>
          <div className={styles.trustGrid}>
            {[
              { icon: "✅", title: "Verified Sellers", desc: "Every vendor is verified and approved" },
              { icon: "🚚", title: "Pan-India Delivery", desc: "Fast shipping to all 28 states" },
              { icon: "🔒", title: "Secure Payments", desc: "Your payment is 100% protected" },
              { icon: "↩️", title: "Easy Returns", desc: "Hassle-free returns within 7 days" },
            ].map((t) => (
              <div key={t.title} className={styles.trustCard}>
                <span className={styles.trustIcon}>{t.icon}</span>
                <div>
                  <strong className={styles.trustTitle}>{t.title}</strong>
                  <p className={styles.trustDesc}>{t.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      {testimonials.length > 0 && (
        <section className={styles.section}>
          <div className={styles.container}>
            <div className={styles.sectionHead}>
              <div>
                <span className={styles.eyebrow}>Happy customers</span>
                <h2 className={styles.sectionTitle}>What People Say</h2>
              </div>
            </div>
            <div className={styles.testimonialGrid}>
              {testimonials.map((t) => (
                <div key={t.id} className={styles.testimonialCard}>
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
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Become a Seller CTA ── */}
      <section className={styles.sellerCta}>
        <div className={styles.container}>
          <div className={styles.sellerCtaInner}>
            <div>
              <h2 className={styles.sellerCtaTitle}>Grow your business with BuyWell</h2>
              <p className={styles.sellerCtaDesc}>Join thousands of sellers across India. List your products, reach millions of customers, and scale your business.</p>
            </div>
            <Link href="/become-vendor" className={styles.sellerCtaBtn}>Start Selling →</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
