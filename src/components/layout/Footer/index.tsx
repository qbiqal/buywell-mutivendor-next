import React from "react";
import Link from "next/link";
import styles from "./Footer.module.css";

export interface FooterLink {
  label: string;
  href: string;
  opensNewTab?: boolean;
}

interface FooterProps {
  logoUrl?: string;
  siteName?: string;
  tagline?: string;
  email?: string;
  phone?: string;
  address?: string;
}

const QUICK_LINKS: FooterLink[] = [
  { label: "Shop All Products", href: "/shop" },
  { label: "Blog & Articles", href: "/blog" },
  { label: "Become a Seller", href: "/become-vendor" },
  { label: "New Arrivals", href: "/shop?sort=newest" },
  { label: "Featured Products", href: "/shop?featured=true" },
  { label: "Vendor Stores", href: "/vendors" },
];

const CUSTOMER_LINKS: FooterLink[] = [
  { label: "My Account", href: "/profile" },
  { label: "My Orders", href: "/orders" },
  { label: "Track Order", href: "/orders" },
  { label: "Notifications", href: "/notifications" },
  { label: "BuyWell Wallet", href: "/profile/link-bwallet" },
  { label: "Contact Us", href: "/contact" },
];

const POLICY_LINKS: FooterLink[] = [
  { label: "Privacy Policy", href: "/policies/privacy-policy" },
  { label: "Terms & Conditions", href: "/policies/terms-and-conditions" },
  { label: "Refund Policy", href: "/policies/refund-policy" },
  { label: "Shipping Policy", href: "/policies/shipping-policy" },
  { label: "Cancellation Policy", href: "/policies/cancellation-policy" },
  { label: "Cookie Policy", href: "/policies/cookie-policy" },
  { label: "Data Retention Policy", href: "/policies/data-retention-policy" },
];

export function Footer({
  logoUrl = "",
  siteName = "BuyWell Marketplace",
  tagline = "India's trusted multivendor marketplace — curated products from verified sellers, delivered pan-India.",
  email = "support@buywell.in",
  phone = "+91 9999999999",
  address = "Bheemanpadi, Kottayam, Kerala – 686003",
}: FooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.ctaBand}>
        <div>
          <span className={styles.badge}>Ready to grow?</span>
          <h2>Start selling on BuyWell today</h2>
          <p>Join thousands of sellers. Zero setup fees. Reach customers across India with your own verified store.</p>
        </div>
        <Link href="/become-vendor" className={styles.ctaLink}>Apply as Seller</Link>
      </div>

      <div className={styles.inner}>
        {/* Brand column */}
        <div className={styles.brandCol}>
          <div className={styles.logo}>
            {logoUrl ? (
              <img src={logoUrl} alt={siteName} className={styles.logoImage} />
            ) : (
              <>
                <div className={styles.logoIcon}>🛍️</div>
                <span className={styles.logoName}>{siteName}</span>
              </>
            )}
          </div>
          <p className={styles.desc}>{tagline}</p>
          <div className={styles.contact}>
            <a href={`mailto:${email}`} className={styles.contactLink}>📧 {email}</a>
            <a href={`tel:${phone.replace(/\s+/g, "")}`} className={styles.contactLink}>📞 {phone}</a>
            <span className={styles.contactText}>📍 {address}</span>
          </div>
          <div className={styles.trustRow}>
            <span>✓ Verified Sellers</span>
            <span>✓ Secure Checkout</span>
            <span>✓ Easy Returns</span>
          </div>
        </div>

        {/* Quick Links */}
        <div className={styles.col}>
          <p className={styles.colTitle}>Quick Links</p>
          <div className={styles.links}>
            {QUICK_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className={styles.footerLink}>{l.label}</Link>
            ))}
          </div>
        </div>

        {/* Customer */}
        <div className={styles.col}>
          <p className={styles.colTitle}>Customer</p>
          <div className={styles.links}>
            {CUSTOMER_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className={styles.footerLink}>{l.label}</Link>
            ))}
          </div>
        </div>

        {/* Policies */}
        <div className={styles.col}>
          <p className={styles.colTitle}>Legal & Policies</p>
          <div className={styles.links}>
            {POLICY_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className={styles.footerLink}>{l.label}</Link>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.bottom}>
        <p className={styles.copyright}>
          © {year} BuyWell Marketplace. All rights reserved.
        </p>
        <a
          href="https://qbiqal.com"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.poweredBy}
          title="Built by Qbiqal — Digital Solutions"
        >
          <span className={styles.poweredByLabel}>Powered by</span>
          <span className={styles.poweredByBrand}>Qbiqal</span>
          <span className={styles.poweredByDot}></span>
        </a>
      </div>
    </footer>
  );
}
