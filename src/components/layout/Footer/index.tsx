import React from "react";
import Link from "next/link";
import styles from "./Footer.module.css";

export interface FooterLink {
  label: string;
  href: string;
  opensNewTab?: boolean;
  children?: FooterLink[];
}

interface FooterProps {
  links?: FooterLink[];
  logoUrl?: string;
  siteName?: string;
  tagline?: string;
  email?: string;
  phone?: string;
  address?: string;
}

const FALLBACK_LINKS: FooterLink[] = [
  { label: "Blog", href: "/blog" },
  { label: "Our Promise", href: "/#promise" },
  { label: "Community", href: "/#gallery" },
  { label: "Free Sample", href: "/#contact" },
];

export function Footer({
  links = FALLBACK_LINKS,
  logoUrl = "",
  siteName = "BuyWell Marketplace",
  tagline = "Authorized partner and CNF of Prakvedaa. Pure mono-floral honey and A2 Bilona Ghee from India's heartland.",
  email = "hello@buywell.in",
  phone = "+91 9470309006",
  address = "Ranchi - 834005, Jharkhand",
}: FooterProps) {
  return (
    <footer className={styles.footer}>
      <div className={styles.ctaBand}>
        <div>
          <span className={styles.badge}>Pure naturals, direct from BuyWell</span>
          <h2>Need help choosing honey or A2 ghee?</h2>
          <p>Talk to the BuyWell team for samples, wholesale enquiries, or product guidance.</p>
        </div>
        <Link href="/#contact" className={styles.ctaLink}>Contact Us</Link>
      </div>

      <div className={styles.inner}>
        <div className={styles.brandCol}>
          <div className={styles.logo}>
            {logoUrl ? (
              <img src={logoUrl} alt={siteName} className={styles.logoImage} />
            ) : (
              <>
                <div className={styles.logoIcon}>🍯</div>
                <span className={styles.logoName}>{siteName}</span>
              </>
            )}
          </div>
          <p className={styles.desc}>{tagline}</p>
          <div className={styles.trustRow}>
            <span>Lab tested</span>
            <span>Raw honey</span>
            <span>Bilona ghee</span>
          </div>
        </div>
        <div className={styles.col}>
          <p className={styles.colTitle}>Products</p>
          <div className={styles.links}>
            <Link href="/shop?category=honey">Tulsi Honey</Link>
            <Link href="/shop?category=honey">Karanj Honey</Link>
            <Link href="/shop?category=honey">Moringa Honey</Link>
            <Link href="/shop?category=ghee">A2 Bilona Ghee</Link>
          </div>
        </div>
        <div className={styles.col}>
          <p className={styles.colTitle}>Company</p>
          <div className={styles.links}>
            {links.map((link) => (
              <div key={`${link.href}-${link.label}`} className={styles.footerLinkGroup}>
                <Link
                  href={link.href}
                  target={link.opensNewTab ? "_blank" : undefined}
                  rel={link.opensNewTab ? "noopener noreferrer" : undefined}
                >
                  {link.label}
                </Link>
                {!!link.children?.length && (
                  <div className={styles.footerSubLinks}>
                    {link.children.map((child) => (
                      <Link
                        key={`${child.href}-${child.label}`}
                        href={child.href}
                        target={child.opensNewTab ? "_blank" : undefined}
                        rel={child.opensNewTab ? "noopener noreferrer" : undefined}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className={styles.col}>
          <p className={styles.colTitle}>Contact</p>
          <div className={styles.contact}>
            <p><a href={`mailto:${email}`}>{email}</a></p>
            <p><a href={`tel:${phone.replace(/\s+/g, "")}`}>{phone}</a></p>
            <p>{address}</p>
          </div>
        </div>
      </div>
      <div className={styles.bottom}>
        <p>© {new Date().getFullYear()} BuyWell Marketplace. All rights reserved.</p>
        <span className={styles.partnerBadge}>✓ Authorized Prakvedaa Partner</span>
      </div>
    </footer>
  );
}
