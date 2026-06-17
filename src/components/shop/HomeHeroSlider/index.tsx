"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import styles from "./HomeHeroSlider.module.css";

export interface HeroBanner {
  id: number;
  title: string | null;
  subtitle: string | null;
  imageUrl: string;
  mobileImageUrl: string | null;
  linkUrl: string | null;
  linkText: string | null;
  bgColor?: string;
}

interface Props {
  banners: HeroBanner[];
  autoPlayMs?: number;
  className?: string;
}

const FALLBACK_BANNERS: HeroBanner[] = [
  {
    id: -1,
    title: "Shop Smarter. Live Better.",
    subtitle: "Thousands of curated products from verified sellers — delivered Pan-India.",
    imageUrl: "",
    mobileImageUrl: null,
    linkUrl: "/shop",
    linkText: "Explore All Products",
    bgColor: "linear-gradient(135deg, #062e24 0%, #0d7659 60%, #14a87a 100%)",
  },
  {
    id: -2,
    title: "Fashion for Everyone",
    subtitle: "Men, Women, Kids & Baby — discover your style at unbeatable prices.",
    imageUrl: "",
    mobileImageUrl: null,
    linkUrl: "/shop?category=mens-fashion",
    linkText: "Shop Fashion",
    bgColor: "linear-gradient(135deg, #1e1b4b 0%, #4c1d95 60%, #7c3aed 100%)",
  },
  {
    id: -3,
    title: "Gadgets & Electronics",
    subtitle: "Phones, accessories and smart gadgets curated for the modern lifestyle.",
    imageUrl: "",
    mobileImageUrl: null,
    linkUrl: "/shop?category=phone-n-gadgets",
    linkText: "Shop Gadgets",
    bgColor: "linear-gradient(135deg, #0c2040 0%, #1d4ed8 60%, #3b82f6 100%)",
  },
];

export function HomeHeroSlider({ banners, autoPlayMs = 5000, className }: Props) {
  const slides = banners.length > 0 ? banners : FALLBACK_BANNERS;
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const next = useCallback(() => setCurrent((c) => (c + 1) % slides.length), [slides.length]);
  const prev = useCallback(() => setCurrent((c) => (c - 1 + slides.length) % slides.length), [slides.length]);

  useEffect(() => {
    if (paused || slides.length <= 1) return;
    timerRef.current = setInterval(next, autoPlayMs);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [next, paused, autoPlayMs, slides.length]);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.changedTouches[0].clientX;
  }
  function handleTouchEnd(e: React.TouchEvent) {
    touchEndX.current = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 40) diff > 0 ? next() : prev();
  }

  if (slides.length === 0) return null;

  return (
    <div
      className={[styles.slider, className ?? ""].join(" ").trim()}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className={styles.track}>
        {slides.map((b, i) => (
          <div
            key={b.id}
            className={[styles.slide, i === current ? styles.active : ""].join(" ")}
            aria-hidden={i !== current}
            style={b.bgColor && !b.imageUrl ? { background: b.bgColor } : undefined}
          >
            {b.imageUrl ? (
              <picture>
                {b.mobileImageUrl && (
                  <source media="(max-width: 640px)" srcSet={b.mobileImageUrl} />
                )}
                <img
                  src={b.imageUrl}
                  alt={b.title ?? "Banner"}
                  className={styles.image}
                  loading={i === 0 ? "eager" : "lazy"}
                />
              </picture>
            ) : (
              <div className={styles.colorBg} />
            )}
            {!b.imageUrl && <div className={styles.colorPattern} aria-hidden />}
            <div className={styles.overlay} />
            {(b.title || b.subtitle || b.linkUrl) && (
              <div className={styles.caption}>
                {b.title && <h2 className={styles.title}>{b.title}</h2>}
                {b.subtitle && <p className={styles.subtitle}>{b.subtitle}</p>}
                {b.linkUrl && (
                  <Link href={b.linkUrl} className={styles.cta}>
                    {b.linkText ?? "Shop Now"}
                    <span className={styles.ctaArrow}>→</span>
                  </Link>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {slides.length > 1 && (
        <>
          <button className={[styles.arrow, styles.arrowPrev].join(" ")} onClick={prev} aria-label="Previous banner">‹</button>
          <button className={[styles.arrow, styles.arrowNext].join(" ")} onClick={next} aria-label="Next banner">›</button>
        </>
      )}

      {slides.length > 1 && (
        <div className={styles.dots} role="tablist" aria-label="Slide selector">
          {slides.map((_, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={i === current}
              aria-label={`Slide ${i + 1}`}
              className={[styles.dot, i === current ? styles.dotActive : ""].join(" ")}
              onClick={() => setCurrent(i)}
            />
          ))}
        </div>
      )}

      {slides.length > 1 && !paused && (
        <div key={`${current}-${autoPlayMs}`} className={styles.progress} style={{ animationDuration: `${autoPlayMs}ms` }} />
      )}
    </div>
  );
}
