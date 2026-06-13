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
}

interface Props {
  banners: HeroBanner[];
  autoPlayMs?: number;
}

const FALLBACK_BANNERS: HeroBanner[] = [
  {
    id: 0,
    title: "Welcome to BuyWell",
    subtitle: "India's trusted multivendor marketplace",
    imageUrl: "/landing-assets/images/hero-placeholder.jpg",
    mobileImageUrl: null,
    linkUrl: "/shop",
    linkText: "Shop Now",
  },
];

export function HomeHeroSlider({ banners, autoPlayMs = 5000 }: Props) {
  const slides = banners.length > 0 ? banners : FALLBACK_BANNERS;
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Touch swipe state
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

  const slide = slides[current];

  return (
    <div
      className={styles.slider}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Slides */}
      <div className={styles.track}>
        {slides.map((b, i) => (
          <div
            key={b.id}
            className={[styles.slide, i === current ? styles.active : ""].join(" ")}
            aria-hidden={i !== current}
          >
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

      {/* Arrows */}
      {slides.length > 1 && (
        <>
          <button className={[styles.arrow, styles.arrowPrev].join(" ")} onClick={prev} aria-label="Previous banner">‹</button>
          <button className={[styles.arrow, styles.arrowNext].join(" ")} onClick={next} aria-label="Next banner">›</button>
        </>
      )}

      {/* Dots */}
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

      {/* Progress bar */}
      {slides.length > 1 && !paused && (
        <div key={`${current}-${autoPlayMs}`} className={styles.progress} style={{ animationDuration: `${autoPlayMs}ms` }} />
      )}
    </div>
  );
}
