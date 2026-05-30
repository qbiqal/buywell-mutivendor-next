"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import styles from "./ComingSoon.module.css";

/** Animated 3-leaf logo — inline SVG for maximum control */
function AnimatedLeafLogo({ size = 80 }: { size?: number }) {
  return (
    <div className={styles.logoWrap} style={{ width: size, height: size }}>
      <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" width={size} height={size}>
        {/* Left leaf — light green, animated */}
        <g className={styles.leafLeft}>
          <path
            d="M36 68 C36 68 6 58 6 36 C6 22 16 14 24 16 C24 16 30 28 34 42 C32 52 34 60 36 68Z"
            fill="#52B788"
            opacity="0.85"
          />
          <path
            d="M36 68 C32 56 28 44 30 34 C28 26 24 18 24 16"
            stroke="rgba(255,255,255,0.25)"
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
          />
        </g>
        {/* Right leaf — medium green */}
        <g className={styles.leafRight}>
          <path
            d="M44 68 C44 68 74 58 74 36 C74 22 64 14 56 16 C56 16 50 28 46 42 C48 52 46 60 44 68Z"
            fill="#74C69D"
            opacity="0.85"
          />
          <path
            d="M44 68 C48 56 52 44 50 34 C52 26 56 18 56 16"
            stroke="rgba(255,255,255,0.25)"
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
          />
        </g>
        {/* Center leaf — dark green, on top */}
        <g className={styles.leafCenter}>
          <path
            d="M40 70 C40 70 18 54 18 32 C18 16 28 6 40 6 C52 6 62 16 62 32 C62 54 40 70 40 70Z"
            fill="#1B4332"
          />
          <path
            d="M40 8 L40 64"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
          {/* Side veins */}
          <path d="M40 20 C36 24 30 28 26 34" stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeLinecap="round" fill="none"/>
          <path d="M40 20 C44 24 50 28 54 34" stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeLinecap="round" fill="none"/>
          <path d="M40 36 C37 39 33 42 30 46" stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeLinecap="round" fill="none"/>
          <path d="M40 36 C43 39 47 42 50 46" stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeLinecap="round" fill="none"/>
        </g>
        {/* Stem */}
        <line x1="40" y1="70" x2="40" y2="76" stroke="#1B4332" strokeWidth="3" strokeLinecap="round"/>
      </svg>
    </div>
  );
}

/** Floating particle */
function Particle({ style }: { style: React.CSSProperties }) {
  return <div className={styles.particle} style={style} />;
}

export default function ComingSoon() {
  const [email, setEmail]   = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [particles] = useState(() =>
    Array.from({ length: 18 }, (_, i) => ({
      id: i,
      left:  `${Math.random() * 100}%`,
      top:   `${Math.random() * 100}%`,
      size:  Math.random() * 8 + 4,
      delay: Math.random() * 4,
      duration: 4 + Math.random() * 6,
      opacity: 0.15 + Math.random() * 0.25,
    }))
  );

  function handleNotify(e: React.FormEvent) {
    e.preventDefault();
    if (email) setSubmitted(true);
  }

  return (
    <div className={styles.page}>
      {/* Animated background blobs */}
      <div className={styles.blob1} />
      <div className={styles.blob2} />
      <div className={styles.blob3} />

      {/* Floating leaf particles */}
      <div className={styles.particles} aria-hidden>
        {particles.map((p) => (
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
            <AnimatedLeafLogo size={72} />
          </div>
          <div className={styles.logoRing} />
        </div>

        {/* Brand name */}
        <div className={styles.brand}>
          <h1 className={styles.brandName}>
            APRAS <span className={styles.brandAccent}>Naturals</span>
          </h1>
          <p className={styles.brandTagline}>Authorized Partner of Prakvedaa</p>
        </div>

        {/* Divider */}
        <div className={styles.divider}>
          <span className={styles.dividerLeaf}>🌿</span>
        </div>

        {/* Headline */}
        <h2 className={styles.headline}>
          Something Pure Is<br/>
          <span className={styles.headlineAccent}>Coming Soon</span>
        </h2>

        <p className={styles.subheadline}>
          We&apos;re crafting a beautiful experience for our pure mono-floral honey
          and authentic A2 Bilona Ghee. Nature&apos;s finest — delivered to your door.
        </p>

        {/* Features teaser */}
        <div className={styles.features}>
          {[
            { icon: "🍯", label: "Tulsi · Karanj · Moringa Honey" },
            { icon: "🥛", label: "A2 Bilona Cow Ghee" },
            { icon: "🌿", label: "100% Natural & Lab Tested" },
          ].map((f) => (
            <div key={f.label} className={styles.feature}>
              <span className={styles.featureIcon}>{f.icon}</span>
              <span className={styles.featureLabel}>{f.label}</span>
            </div>
          ))}
        </div>

        {/* Email notify */}
        {!submitted ? (
          <form onSubmit={handleNotify} className={styles.notifyForm}>
            <p className={styles.notifyLabel}>Get notified when we launch</p>
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
                Notify Me →
              </button>
            </div>
          </form>
        ) : (
          <div className={styles.notifySuccess}>
            <span>✅</span>
            <span>You&apos;re on the list! We&apos;ll reach out soon.</span>
          </div>
        )}

        {/* WhatsApp CTA */}
        <p className={styles.whatsappLine}>
          For immediate orders:{" "}
          <a href="https://wa.me/919470309006" target="_blank" rel="noopener noreferrer" className={styles.whatsappLink}>
            💬 WhatsApp +91 9470309006
          </a>
        </p>

        {/* Preview site link */}
        <div className={styles.previewLinks}>
          <Link href="/home" className={styles.previewLink}>
            Preview the full site →
          </Link>
          <span className={styles.previewDot}>·</span>
          <Link href="/shop" className={styles.previewLink}>
            Browse products →
          </Link>
        </div>

        {/* Footer note */}
        <p className={styles.footerNote}>
          Ranchi, Jharkhand, India &nbsp;·&nbsp; aprasnaturals@gmail.com
        </p>
      </div>
    </div>
  );
}
