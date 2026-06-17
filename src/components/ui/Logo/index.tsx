import React from "react";

interface LogoProps {
  size?: number;
  className?: string;
}

/**
 * BuyWell Marketplace 3-leaf logo
 * — 1 dark green center leaf (pointing up)
 * — 2 lighter green side leaves
 */
export function LeafLogo({ size = 40, className = "" }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="BuyWell Marketplace leaf logo"
    >
      {/* Left leaf — light green, fans left */}
      <path
        d="M18 32 C18 32 4 28 4 16 C4 10 10 6 14 8 C14 8 16 14 18 20 C16 24 17 28 18 32Z"
        fill="#52B788"
        opacity="0.9"
      />
      {/* Right leaf — light green, fans right */}
      <path
        d="M22 32 C22 32 36 28 36 16 C36 10 30 6 26 8 C26 8 24 14 22 20 C24 24 23 28 22 32Z"
        fill="#74C69D"
        opacity="0.9"
      />
      {/* Center leaf — dark green, points straight up */}
      <path
        d="M20 34 C20 34 10 26 10 16 C10 8 16 3 20 3 C24 3 30 8 30 16 C30 26 20 34 20 34Z"
        fill="#1B4332"
      />
      {/* Stem */}
      <line x1="20" y1="34" x2="20" y2="37" stroke="#1B4332" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Center vein — light */}
      <path
        d="M20 6 C20 6 20 28 20 32"
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Full logo lockup: icon + text */
export function LogoFull({ size = 40, textSize = 20, darkText = false }: { size?: number; textSize?: number; darkText?: boolean }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{
        width: size,
        height: size,
        background: "linear-gradient(135deg, #1B4332, #2D7D46)",
        borderRadius: 11,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 4px 16px rgba(27,67,50,0.35)",
        flexShrink: 0,
      }}>
        <LeafLogo size={size * 0.72} />
      </span>
      <span style={{
        fontFamily: "var(--font-serif)",
        fontSize: textSize,
        fontWeight: 700,
        letterSpacing: "-0.02em",
        color: darkText ? "var(--ink)" : "#fff",
      }}>
        BuyWell <span style={{ color: "#52B788" }}>Marketplace</span>
      </span>
    </span>
  );
}

/** Compact icon-only badge */
export function LogoIcon({ size = 36 }: { size?: number }) {
  return (
    <span style={{
      width: size, height: size,
      background: "linear-gradient(135deg, #1B4332, #2D7D46)",
      borderRadius: Math.round(size * 0.28),
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 4px 16px rgba(27,67,50,0.35)",
      flexShrink: 0,
    }}>
      <LeafLogo size={Math.round(size * 0.72)} />
    </span>
  );
}
