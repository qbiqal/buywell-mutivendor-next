import React from "react";
import Link from "next/link";
import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.col}>
          <div className={styles.logo}>
            <div className={styles.logoIcon}>🍯</div>
            <span className={styles.logoName}>APRAS Naturals</span>
          </div>
          <p className={styles.desc}>Authorized partner and CNF of Prakvedaa. Pure mono-floral honey and A2 Bilona Ghee from India's heartland.</p>
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
            <Link href="/blog">Blog</Link>
            <Link href="/#promise">Our Promise</Link>
            <Link href="/#gallery">Community</Link>
            <Link href="/checkout?sample=true">Free Sample</Link>
          </div>
        </div>
        <div className={styles.col}>
          <p className={styles.colTitle}>Contact</p>
          <div className={styles.contact}>
            <p><a href="mailto:aprasnaturals@gmail.com">aprasnaturals@gmail.com</a></p>
            <p><a href="tel:+919470309006">+91 9470309006</a></p>
            <p>Ranchi – 834005, Jharkhand</p>
          </div>
        </div>
      </div>
      <div className={styles.bottom}>
        <p>© {new Date().getFullYear()} APRAS Naturals. All rights reserved.</p>
        <span className={styles.partnerBadge}>✓ Authorized Prakvedaa Partner</span>
      </div>
    </footer>
  );
}
