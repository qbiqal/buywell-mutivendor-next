import type { Metadata } from "next";
import Link from "next/link";
import styles from "../policy.module.css";

export const metadata: Metadata = {
  title: "Terms & Conditions | BuyWell Marketplace",
  description: "Terms and conditions governing use of BuyWell Marketplace — India's trusted multivendor marketplace.",
};

export default function TermsPage() {
  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumb}>
        <Link href="/">Home</Link> <span>/</span> <span>Terms &amp; Conditions</span>
      </nav>

      <header className={styles.header}>
        <span className={styles.badge}>Legal</span>
        <h1 className={styles.title}>Terms &amp; Conditions</h1>
        <div className={styles.meta}>
          <span><strong>Effective Date:</strong> 1 June 2025</span>
          <span><strong>Last Updated:</strong> 17 June 2026</span>
        </div>
      </header>

      <div className={styles.body}>
        <p>
          These Terms and Conditions ("Terms") govern your access to and use of the BuyWell Marketplace platform, operated by <strong>Qbiqal Technology Solutions</strong> ("Company", "we", "our", "us"). By registering, browsing, or purchasing on <strong>buywell.in</strong>, you agree to be bound by these Terms. If you disagree, please do not use our platform.
        </p>

        <h2>1. Definitions</h2>
        <ul>
          <li><strong>"Platform"</strong> — The BuyWell Marketplace website and services at buywell.in.</li>
          <li><strong>"User"</strong> — Any person who accesses the platform (buyer, seller, visitor).</li>
          <li><strong>"Customer"</strong> — A registered user who purchases products.</li>
          <li><strong>"Vendor / Seller"</strong> — A registered seller who lists products on the platform.</li>
          <li><strong>"Listing"</strong> — A product posted for sale by a Vendor.</li>
          <li><strong>"Order"</strong> — A confirmed purchase transaction.</li>
        </ul>

        <h2>2. Eligibility</h2>
        <ul>
          <li>You must be at least 18 years of age to register an account or place orders.</li>
          <li>By using the platform, you represent that you have the legal capacity to form a binding contract.</li>
          <li>Accounts on behalf of minors must be managed by a legal guardian.</li>
          <li>The platform is intended for personal use or legitimate business use. Resale bots and automated scraping are prohibited.</li>
        </ul>

        <h2>3. Account Registration</h2>
        <ul>
          <li>You must provide accurate, complete, and current information when registering.</li>
          <li>You are responsible for maintaining the confidentiality of your password and all account activity.</li>
          <li>Notify us immediately at <a href="mailto:support@buywell.in">support@buywell.in</a> if you suspect unauthorised access.</li>
          <li>We reserve the right to suspend or terminate accounts that violate these Terms.</li>
          <li>You may delete your account at any time from the Profile settings. A 60-day restoration window applies before permanent deletion. See our <Link href="/policies/data-retention-policy">Data Retention Policy</Link>.</li>
        </ul>

        <h2>4. Products and Listings</h2>
        <ul>
          <li>Products on BuyWell are listed by approved Vendors or the BuyWell admin team.</li>
          <li>Product images, descriptions, and specifications are provided in good faith; minor variations may occur.</li>
          <li>Pricing is displayed in Indian Rupees (INR) inclusive of applicable taxes unless stated otherwise.</li>
          <li>BuyWell does not guarantee continuous availability of any product and reserves the right to remove listings without notice.</li>
          <li>In case of price display errors, we will contact you before processing the order.</li>
        </ul>

        <h2>5. Orders and Payments</h2>
        <ul>
          <li>An order is confirmed only after successful payment verification.</li>
          <li>We accept payments via Razorpay (cards, UPI, net banking) and offline bank transfer/QR.</li>
          <li>All transactions are in INR. For offline payments, orders are confirmed after payment proof is verified by our team (typically within 24 business hours).</li>
          <li>You will receive an order confirmation via email. Keep this as proof of purchase.</li>
          <li>BuyWell acts as a marketplace facilitator; the contract of sale is between you and the Vendor.</li>
        </ul>

        <h2>6. Shipping and Delivery</h2>
        <p>See our <Link href="/policies/shipping-policy">Shipping Policy</Link> for full delivery terms, estimated timelines, and tracking information.</p>

        <h2>7. Returns, Refunds, and Cancellations</h2>
        <p>Please review our <Link href="/policies/refund-policy">Refund Policy</Link> and <Link href="/policies/cancellation-policy">Cancellation Policy</Link> for complete details.</p>

        <h2>8. Vendor Terms</h2>
        <ul>
          <li>Vendors must apply and be approved before listing products.</li>
          <li>Vendors are responsible for accurate product information, stock availability, and timely dispatch.</li>
          <li>Vendors must comply with all applicable Indian laws including GST, Consumer Protection Act 2019, and Legal Metrology Act.</li>
          <li>BuyWell charges a commission on each sale; the current rate is communicated during vendor onboarding.</li>
          <li>Vendors are prohibited from listing counterfeit, prohibited, or restricted goods.</li>
          <li>BuyWell may suspend or terminate vendor accounts for policy violations, with 7 days notice except in cases of fraud.</li>
          <li>Payouts are processed on a set schedule communicated during onboarding, after deducting commission and any applicable returns.</li>
        </ul>

        <h2>9. Prohibited Conduct</h2>
        <p>You must not:</p>
        <ul>
          <li>List, sell, or purchase prohibited or illegal goods (narcotics, weapons, counterfeit products, etc.).</li>
          <li>Engage in fraudulent transactions or payment manipulation.</li>
          <li>Use the platform to harass, abuse, or harm other users.</li>
          <li>Attempt to reverse-engineer, scrape, or disrupt the platform.</li>
          <li>Create multiple accounts to exploit promotions or evade bans.</li>
          <li>Post false, misleading, or defamatory reviews or content.</li>
          <li>Violate any applicable local, national, or international law.</li>
        </ul>

        <h2>10. Intellectual Property</h2>
        <ul>
          <li>All content on BuyWell (logos, design, code, text) is owned by Qbiqal Technology Solutions or licensed to us.</li>
          <li>You may not reproduce, distribute, or modify our content without explicit written permission.</li>
          <li>Vendors retain ownership of their product content but grant BuyWell a non-exclusive licence to display it on the platform.</li>
        </ul>

        <h2>11. Reviews and User Content</h2>
        <ul>
          <li>Reviews must be honest, accurate, and based on actual purchase experience.</li>
          <li>We reserve the right to remove reviews that violate our moderation policy (abuse, spam, fake reviews).</li>
          <li>By submitting a review, you grant BuyWell a perpetual, royalty-free licence to display it.</li>
        </ul>

        <h2>12. Limitation of Liability</h2>
        <p>To the maximum extent permitted by law:</p>
        <ul>
          <li>BuyWell is a marketplace facilitator and is not responsible for the quality, safety, or legality of products listed by Vendors.</li>
          <li>We are not liable for indirect, incidental, or consequential damages arising from use of the platform.</li>
          <li>Our total liability for any claim shall not exceed the amount paid by you for the specific order in dispute.</li>
          <li>Nothing in these Terms limits liability for death or personal injury caused by our negligence, or fraudulent misrepresentation.</li>
        </ul>

        <h2>13. Governing Law and Disputes</h2>
        <ul>
          <li>These Terms are governed by the laws of India.</li>
          <li>Disputes shall first be attempted to resolve through mediation within 30 days.</li>
          <li>Unresolved disputes shall be subject to the exclusive jurisdiction of courts in Kottayam, Kerala, India.</li>
          <li>Consumer disputes may also be filed with the appropriate Consumer Forum under the Consumer Protection Act, 2019.</li>
        </ul>

        <h2>14. Modifications</h2>
        <p>We may update these Terms at any time. Material changes will be notified via email 30 days before taking effect. Continued use after the effective date constitutes acceptance of the updated Terms.</p>

        <h2>15. Contact</h2>
        <p>For any questions about these Terms, contact us at <a href="mailto:support@buywell.in">support@buywell.in</a>.</p>
      </div>

      <div className={styles.contactBox}>
        <h3>Legal Queries</h3>
        <p>Email: <a href="mailto:support@buywell.in">support@buywell.in</a><br />Bheemanpadi, Kottayam West, Kottayam, Kerala – 686003, India</p>
      </div>
    </div>
  );
}
