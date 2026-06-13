"use client";
import React, { useState } from "react";
import styles from "./ComingSoon.module.css";

function ShoppingBagLogo({ size = 72 }: { size?: number }) {
  return (
    <div className={styles.logoWrap} style={{ width: size, height: size }}>
      <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" width={size} height={size}>
        {/* Bag body */}
        <rect x="14" y="28" width="52" height="40" rx="6" fill="white" opacity="0.95" />
        {/* Bag handle */}
        <path
          d="M28 28 C28 18 52 18 52 28"
          stroke="white"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
          opacity="0.9"
        />
        {/* BW initials */}
        <text
          x="40"
          y="55"
          textAnchor="middle"
          fontSize="16"
          fontWeight="800"
          fontFamily="system-ui, sans-serif"
          fill="#4ade80"
        >
          BW
        </text>
        {/* Small sparkle */}
        <circle cx="60" cy="20" r="3" fill="#a7f3d0" opacity="0.8" />
        <circle cx="66" cy="14" r="2" fill="#a7f3d0" opacity="0.5" />
      </svg>
    </div>
  );
}

function Particle({ style }: { style: React.CSSProperties }) {
  return <div className={styles.particle} style={style} />;
}

const PARTICLES = Array.from({ length: 16 }, (_, i) => {
  const seed = (i + 1) * 41;
  return {
    id: i,
    left: `${(seed * 17) % 100}%`,
    top: `${(seed * 29) % 100}%`,
    size: ((seed * 7) % 8) + 4,
    delay: ((seed * 11) % 40) / 10,
    duration: 4 + ((seed * 13) % 60) / 10,
    opacity: 0.12 + (((seed * 19) % 20) / 100),
  };
});

export default function ComingSoon() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleNotify(e: React.FormEvent) {
    e.preventDefault();
    if (email) setSubmitted(true);
  }

  return (
    <div className={styles.page}>
      <div className={styles.blob1} />
      <div className={styles.blob2} />
      <div className={styles.blob3} />

      <div className={styles.particles} aria-hidden>
        {PARTICLES.map((p) => (
          <Particle
            key={p.id}
            style={{
              left: p.left,
              top: p.top,
              width: p.size,
              height: p.size,
              opacity: p.opacity,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
            }}
          />
        ))}
      </div>

      <div className={styles.content}>
        {/* Logo */}
        <div className={styles.logoContainer}>
          <div className={styles.logoBg}>
            <ShoppingBagLogo size={60} />
          </div>
          <div className={styles.logoRing} />
        </div>

        {/* Brand */}
        <div className={styles.brand}>
          <h1 className={styles.brandName}>
            Buy<span className={styles.brandAccent}>Well</span>
          </h1>
          <p className={styles.brandTagline}>India&apos;s Multivendor Marketplace</p>
        </div>

        <div className={styles.divider}>
          <span className={styles.dividerDot}>✦</span>
        </div>

        <h2 className={styles.headline}>
          A New Way to<br />
          <span className={styles.headlineAccent}>Shop &amp; Sell</span>
        </h2>

        <p className={styles.subheadline}>
          Thousands of verified sellers. Millions of products. Fast delivery across India.
          We&apos;re building something big — and it&apos;s almost ready.
        </p>

        <div className={styles.features}>
          {[
            { icon: "🏪", label: "Verified Sellers" },
            { icon: "🚚", label: "Pan-India Delivery" },
            { icon: "💳", label: "Secure Payments" },
          ].map((f) => (
            <div key={f.label} className={styles.feature}>
              <span className={styles.featureIcon}>{f.icon}</span>
              <span className={styles.featureLabel}>{f.label}</span>
            </div>
          ))}
        </div>

        {!submitted ? (
          <form onSubmit={handleNotify} className={styles.notifyForm}>
            <p className={styles.notifyLabel}>Be the first to know when we launch</p>
            <div className={styles.notifyRow}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className={styles.notifyInput}
              />
              <button type="submit" className={styles.notifyBtn}>
                Notify Me
              </button>
            </div>
          </form>
        ) : (
          <div className={styles.notifySuccess}>
            <span>✅</span>
            <span>You&apos;re on the list! We&apos;ll notify you at launch.</span>
          </div>
        )}

        <p className={styles.footerNote}>
          buywell.in &nbsp;·&nbsp; © 2026 BuyWell. All rights reserved.
        </p>
      </div>
    </div>
  );
}
