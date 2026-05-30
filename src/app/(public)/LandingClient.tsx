"use client";
/**
 * Landing page — all sections driven by CMS config from DB.
 * Visual implementation mirrors the enhanced index.html from the HTML prototype.
 * Hero section uses the same scroll-scrub video logic.
 */
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import styles from "./landing.module.css";

interface LandingClientProps {
  sections: Record<string, Record<string, unknown>>;
  siteConfig: Record<string, string>;
  featuredProducts: Array<{ id: string; name: string; slug: string; category: string; description: string | null }>;
  testimonials: Array<{ id: string; name: string; content: string; mediaUrl: string | null; mediaType: string | null }>;
  recentPosts: Array<{ id: string; title: string; slug: string; excerpt: string | null; coverImageUrl: string | null; publishedAt: Date | null }>;
}

export default function LandingClient({ sections, siteConfig, featuredProducts, testimonials, recentPosts }: LandingClientProps) {
  const hero       = sections["hero"]     ?? {};
  const cinemaRef  = useRef<HTMLDivElement>(null);
  const videoRef   = useRef<HTMLVideoElement>(null);
  const heroTextRef = useRef<HTMLDivElement>(null);
  const tlFillRef  = useRef<HTMLDivElement>(null);

  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const video  = videoRef.current;
    const cinema = cinemaRef.current;
    const heroText = heroTextRef.current;
    const tlFill = tlFillRef.current;
    if (!video || !cinema) return;

    let scrubTarget = 0, scrubCurrent = 0, running = false;

    function sizeCinema() {
      if (!cinema || !video) return;
      const dur = isFinite(video.duration) && video.duration > 0 ? video.duration : 30;
      const perSec = window.innerWidth < 720 ? 50 : 65;
      cinema.style.height = Math.max(400, Math.min(700, Math.round(dur * perSec))) + "vh";
    }

    function tick() {
      if (!video) { running = false; return; }
      scrubCurrent += (scrubTarget - scrubCurrent) * 0.2;
      if (Math.abs(scrubTarget - scrubCurrent) < 0.005) scrubCurrent = scrubTarget;
      try { if (video.readyState >= 2) video.currentTime = scrubCurrent * video.duration; } catch {}
      if (Math.abs(scrubTarget - scrubCurrent) > 0.001) requestAnimationFrame(tick);
      else running = false;
    }

    function onScroll() {
      if (!cinema) return;
      const total = cinema.offsetHeight - window.innerHeight;
      const raw   = Math.max(0, Math.min(1, (-cinema.getBoundingClientRect().top) / total));
      scrubTarget = raw;
      if (tlFill) tlFill.style.width = (raw * 100).toFixed(2) + "%";
      if (heroText) {
        const opacity = raw > 0.25 ? Math.max(0, 1 - (raw - 0.25) / 0.2) : 1;
        heroText.style.opacity = String(opacity);
        heroText.style.transform = `translateY(${raw * -60}px)`;
      }
      if (!running) { running = true; requestAnimationFrame(tick); }
    }

    video.addEventListener("loadedmetadata", () => { sizeCinema(); onScroll(); });
    video.addEventListener("play", () => { try { video.pause(); } catch {} });
    video.muted = true; video.playsInline = true;
    video.pause();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", () => { sizeCinema(); onScroll(); });
    setTimeout(() => { sizeCinema(); onScroll(); }, 1000);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Reveal on scroll
  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.08, rootMargin: "0px 0px -60px 0px" });
    document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const videoSrc = (hero.videoUrl as string) ?? "/videos/APRUS.mp4";
  const heroHeading   = (hero.heading as string)   ?? "Nature's Liquid Gold";
  const heroSubheading = (hero.subheading as string) ?? "Uncompromised. Unprocessed. Unadulterated.";
  const heroBadge     = (hero.badgeText as string)  ?? "Authorized Partner of Prakvedaa";

  return (
    <div className={styles.landing}>
      {/* ── CINEMA HERO ─── */}
      <div className={styles.cinemaWrap} ref={cinemaRef}>
        <div className={styles.cinemaStage}>
          {/* No full-screen overlay — video shows naturally */}
          <div className={styles.heroText} ref={heroTextRef}>
            {/* Dark backdrop ONLY behind the text panel */}
            <div className={styles.heroTextPanel}>
              <div className={styles.heroBadge}><div className={styles.heroBadgeDot} />{heroBadge}</div>
              <h1 className={styles.heroHeading}>
                Nature&apos;s{" "}
                <span className={styles.heroHeadingAccent}>Liquid Gold</span>
              </h1>
              <div className={styles.heroDivider} />
              <p className={styles.heroSubheading}>{heroSubheading}</p>
              <div className={styles.heroCtas}>
                <Link href="/shop" className={styles.heroCtaPrimary}>Explore Collection</Link>
                <Link href="/checkout?sample=true" className={styles.heroCtaGhost}>Request Free Sample</Link>
              </div>
            </div>
          </div>
          <video ref={videoRef} className={styles.cinemaVideo} src={videoSrc} muted playsInline preload="auto" aria-hidden />
          <div className={styles.cinemaTimeline}><div className={styles.timelineFill} ref={tlFillRef} /></div>
        </div>
      </div>

      {/* ── MARQUEE ─── */}
      {sections["marquee"] && (
        <div className={styles.marqueeWrap}>
          <div className={styles.marqueeTrack}>
            {["PURE RAW HONEY","100% AUTHENTIC","LAB TESTED PURITY","NO ADDED SUGAR","MONO FLORAL SOURCED","A2 BILONA GHEE","AUTHORIZED BY PRAKVEDAA","JHARKHAND INDIA"].flatMap((t, i) => [
              <span key={`t${i}`}>{t}</span>, <span key={`d${i}`} className={styles.marqueeDot}>✦</span>
            ])}
            {["PURE RAW HONEY","100% AUTHENTIC","LAB TESTED PURITY","NO ADDED SUGAR","MONO FLORAL SOURCED","A2 BILONA GHEE","AUTHORIZED BY PRAKVEDAA","JHARKHAND INDIA"].flatMap((t, i) => [
              <span key={`t2${i}`}>{t}</span>, <span key={`d2${i}`} className={styles.marqueeDot}>✦</span>
            ])}
          </div>
        </div>
      )}

      {/* ── PRODUCTS SECTION ─── */}
      {sections["products"] && featuredProducts.length > 0 && (
        <section className={styles.productsSection}>
          <div className={styles.container}>
            <div className="reveal" style={{ maxWidth: 600 }}>
              <p className="eyebrow">Our Collection</p>
              <h2 className="section-title serif">{(sections["products"].heading as string) ?? "Pure Mono-Floral Honey"}</h2>
              <p className="section-lead">Raw, single-source honeys and authentic A2 Ghee.</p>
            </div>
            <div className={styles.productGrid}>
              {featuredProducts.map((p, i) => (
                <Link key={p.id} href={`/shop/${p.slug}`} className={`${styles.productCard} reveal`} data-delay={String(i + 1)}>
                  <div className={styles.productImgWrap}>
                    <div className={styles.productImgPlaceholder}>🍯</div>
                  </div>
                  <div className={styles.productBody}>
                    <p className={styles.productCategory}>{p.category}</p>
                    <h3 className={styles.productName}>{p.name}</h3>
                    <p className={styles.productDesc}>{p.description}</p>
                    <p className={styles.productCta}>Shop Now →</p>
                  </div>
                </Link>
              ))}
            </div>
            <div style={{ textAlign: "center", marginTop: 32 }}>
              <Link href="/shop" className={styles.viewAllBtn}>View All Products →</Link>
            </div>
          </div>
        </section>
      )}

      {/* ── MISSION ─── */}
      {sections["mission"] && (
        <section className={styles.missionSection}>
          <div className={styles.container}>
            <div className="reveal">
              <blockquote className={styles.missionQuote}>
                "{(sections["mission"].quote as string) ?? "To reconnect people with the pure, untampered gifts of nature."}"
              </blockquote>
              <p className={styles.missionAttrib}>— APRAS Naturals Mission</p>
            </div>
          </div>
        </section>
      )}

      {/* ── RECENT BLOG ─── */}
      {recentPosts.length > 0 && (
        <section className={styles.blogSection}>
          <div className={styles.container}>
            <div className="reveal">
              <p className="eyebrow">From Our Blog</p>
              <h2 className="section-title serif">Stories of Purity</h2>
            </div>
            <div className={styles.blogGrid}>
              {recentPosts.map((post, i) => (
                <Link key={post.id} href={`/blog/${post.slug}`} className={`${styles.blogCard} reveal`} data-delay={String(i + 1)}>
                  {post.coverImageUrl ? (
                    <div className={styles.blogImgWrap}>
                      <Image src={post.coverImageUrl} alt={post.title} fill style={{ objectFit: "cover" }} />
                    </div>
                  ) : <div className={styles.blogImgPlaceholder}>📝</div>}
                  <div className={styles.blogCardBody}>
                    <p className={styles.blogDate}>{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : ""}</p>
                    <h3 className={styles.blogTitle}>{post.title}</h3>
                    {post.excerpt && <p className={styles.blogExcerpt}>{post.excerpt}</p>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
