import type { Metadata } from "next";
import Link from "next/link";
import styles from "../policy.module.css";

export const metadata: Metadata = {
  title: "Cookie Policy | BuyWell Marketplace",
  description: "How BuyWell uses cookies and similar tracking technologies.",
};

export default function CookiePolicyPage() {
  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumb}>
        <Link href="/">Home</Link> <span>/</span> <span>Cookie Policy</span>
      </nav>

      <header className={styles.header}>
        <span className={styles.badge}>Legal</span>
        <h1 className={styles.title}>Cookie Policy</h1>
        <div className={styles.meta}>
          <span><strong>Effective Date:</strong> 1 June 2025</span>
          <span><strong>Last Updated:</strong> 17 June 2026</span>
        </div>
      </header>

      <div className={styles.body}>
        <p>
          This Cookie Policy explains how BuyWell Marketplace ("BuyWell", "we", "our") uses cookies and similar technologies when you visit <strong>buywell.in</strong>. It should be read together with our <Link href="/policies/privacy-policy">Privacy Policy</Link>.
        </p>

        <h2>1. What Are Cookies?</h2>
        <p>
          Cookies are small text files placed on your device when you visit a website. They allow the website to recognise your device and remember certain information about your visit — such as your login session, cart contents, or preferences.
        </p>
        <p>Similar technologies include local storage (used for cart data) and session storage.</p>

        <h2>2. Cookies We Use</h2>

        <h3>Strictly Necessary Cookies</h3>
        <p>These cookies are essential for the platform to function and cannot be disabled:</p>
        <ul>
          <li><strong>bw_session</strong> — Stores your login session token (HTTP-only, secure). Expires when you log out or after 7 days of inactivity.</li>
          <li><strong>bw_csrf</strong> — Cross-site request forgery prevention token. Session-scoped.</li>
        </ul>

        <h3>Functional Cookies / Local Storage</h3>
        <p>Used to remember your preferences and improve your experience:</p>
        <ul>
          <li><strong>bw_cart</strong> (localStorage) — Stores your shopping cart contents locally on your device. Not transmitted to servers until checkout.</li>
          <li><strong>bw_theme</strong> (localStorage) — Stores your UI theme preference (if applicable).</li>
        </ul>

        <h3>Analytics Cookies</h3>
        <p>We use <strong>first-party analytics only</strong> — no Google Analytics, Meta Pixel, or third-party trackers:</p>
        <ul>
          <li>We collect page view events server-side to understand popular products and pages.</li>
          <li>Data is aggregated and anonymised; it cannot be used to identify individual users.</li>
          <li>No cookies are set for analytics purposes.</li>
        </ul>

        <h3>Third-Party Cookies</h3>
        <ul>
          <li><strong>Razorpay:</strong> When you complete a payment, Razorpay may set its own cookies on their hosted payment page. These are governed by <a href="https://razorpay.com/privacy/" target="_blank" rel="noopener noreferrer">Razorpay&apos;s Privacy Policy</a>.</li>
          <li>We do not use advertising, retargeting, or social media tracking cookies.</li>
        </ul>

        <h2>3. Managing Cookies</h2>
        <p>You can control cookies through your browser settings:</p>
        <ul>
          <li><strong>Chrome:</strong> Settings → Privacy and security → Cookies and other site data.</li>
          <li><strong>Firefox:</strong> Settings → Privacy &amp; Security → Cookies and Site Data.</li>
          <li><strong>Safari:</strong> Settings → Safari → Privacy &amp; Security.</li>
          <li><strong>Edge:</strong> Settings → Cookies and site permissions.</li>
        </ul>
        <blockquote>
          Note: Disabling strictly necessary cookies will prevent you from logging in or using core platform features.
        </blockquote>

        <h2>4. Cookie Consent</h2>
        <p>
          By continuing to use BuyWell, you consent to strictly necessary cookies which are required for the platform to function. For functional and analytics cookies, you may opt out without impacting core functionality.
        </p>
        <p>Under the DPDP Act 2023 and GDPR, you have the right to withdraw consent for optional cookies at any time through browser settings.</p>

        <h2>5. Changes to This Policy</h2>
        <p>We may update this Cookie Policy from time to time. Changes will be communicated via email or a notice on the platform.</p>
      </div>

      <div className={styles.contactBox}>
        <h3>Cookie Questions</h3>
        <p>Email: <a href="mailto:privacy@buywell.in">privacy@buywell.in</a></p>
      </div>
    </div>
  );
}
