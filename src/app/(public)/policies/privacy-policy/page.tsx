import type { Metadata } from "next";
import Link from "next/link";
import styles from "../policy.module.css";

export const metadata: Metadata = {
  title: "Privacy Policy | BuyWell Marketplace",
  description: "How BuyWell collects, uses, stores, and protects your personal data. GDPR and DPDP 2023 compliant.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumb}>
        <Link href="/">Home</Link> <span>/</span> <span>Privacy Policy</span>
      </nav>

      <header className={styles.header}>
        <span className={styles.badge}>Legal</span>
        <h1 className={styles.title}>Privacy Policy</h1>
        <div className={styles.meta}>
          <span><strong>Effective Date:</strong> 1 June 2025</span>
          <span><strong>Last Updated:</strong> 17 June 2026</span>
          <span><strong>Version:</strong> 2.0</span>
        </div>
      </header>

      <div className={styles.body}>
        <p>
          BuyWell Marketplace ("BuyWell", "we", "our", or "us"), operated by Qbiqal Technology Solutions, is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your personal data when you visit <strong>buywell.in</strong> or use our services.
        </p>
        <p>
          This policy is compliant with the <strong>Digital Personal Data Protection Act, 2023 (DPDP Act)</strong> of India, the <strong>General Data Protection Regulation (GDPR)</strong> of the European Union, and other applicable data protection laws.
        </p>

        <h2>1. Who We Are (Data Fiduciary)</h2>
        <p>
          <strong>Data Fiduciary / Controller:</strong> Qbiqal Technology Solutions<br />
          <strong>Platform:</strong> BuyWell Marketplace (buywell.in)<br />
          <strong>Registered Address:</strong> Bheemanpadi, Kottayam West, Kottayam, Kerala – 686003, India<br />
          <strong>Contact Email:</strong> <a href="mailto:privacy@buywell.in">privacy@buywell.in</a><br />
          <strong>Grievance Officer:</strong> Reachable via the contact email above.
        </p>

        <h2>2. Personal Data We Collect</h2>
        <h3>2.1 Data You Provide</h3>
        <ul>
          <li><strong>Account data:</strong> Name, email address, phone number, and password hash when you register.</li>
          <li><strong>Profile data:</strong> First name, last name, avatar URL, linked BuyWell Global ID.</li>
          <li><strong>Address data:</strong> Shipping/billing addresses including name, phone, address lines, city, state, and pincode.</li>
          <li><strong>Order data:</strong> Products ordered, quantities, prices, delivery instructions, and payment proof uploads.</li>
          <li><strong>Vendor data:</strong> Business name, GSTIN, bank details, store description (for seller applicants only).</li>
          <li><strong>Communication data:</strong> Messages you send us, review text, blog comments.</li>
        </ul>

        <h3>2.2 Data Collected Automatically</h3>
        <ul>
          <li><strong>Usage data:</strong> Pages visited, time on site, click paths (first-party analytics, no third-party trackers).</li>
          <li><strong>Device data:</strong> Browser type, operating system, IP address, language preference.</li>
          <li><strong>Cookie data:</strong> Session tokens, preference cookies. See our <Link href="/policies/cookie-policy">Cookie Policy</Link>.</li>
        </ul>

        <h3>2.3 Data from Third Parties</h3>
        <ul>
          <li><strong>BuyWell Global:</strong> If you link your BuyWell Global account, we receive your BuyWell user ID and wallet balance via their API, with your explicit consent.</li>
          <li><strong>Razorpay:</strong> Payment confirmation signals (we do not store card data; all sensitive payment data is processed by Razorpay).</li>
        </ul>

        <h2>3. Lawful Bases for Processing (GDPR / DPDP)</h2>
        <ul>
          <li><strong>Contract performance:</strong> Processing orders, managing your account, delivering products.</li>
          <li><strong>Consent:</strong> Marketing communications, optional profile features, linking BuyWell Wallet.</li>
          <li><strong>Legitimate interests:</strong> Fraud prevention, platform security, analytics to improve the service.</li>
          <li><strong>Legal obligation:</strong> Tax records, compliance with court orders, DPDP and GST requirements.</li>
        </ul>

        <h2>4. How We Use Your Data</h2>
        <ul>
          <li>Create and manage your customer or vendor account.</li>
          <li>Process and fulfil orders, including sharing delivery address with the relevant vendor.</li>
          <li>Send order confirmations, status updates, and transactional notifications via email and WhatsApp.</li>
          <li>Provide customer support and respond to queries.</li>
          <li>Detect and prevent fraud, abuse, and security incidents.</li>
          <li>Improve the platform through aggregated, anonymised analytics.</li>
          <li>Send promotional emails or offers — only with your explicit opt-in consent.</li>
          <li>Comply with applicable laws and regulatory requirements.</li>
        </ul>

        <h2>5. Data Sharing and Disclosure</h2>
        <p>We never sell your personal data. We share data only in the following circumstances:</p>
        <ul>
          <li><strong>Vendors:</strong> Your name, phone, and delivery address are shared with the seller of products you purchase, solely to fulfil your order.</li>
          <li><strong>Payment processors:</strong> Razorpay receives order amount and identifiers to process payment. See <a href="https://razorpay.com/privacy/" target="_blank" rel="noopener noreferrer">Razorpay&apos;s Privacy Policy</a>.</li>
          <li><strong>Logistics partners:</strong> If applicable, your delivery address is shared with courier services.</li>
          <li><strong>Service providers:</strong> Hosting (Hetzner Cloud), email delivery, analytics — all under data processing agreements.</li>
          <li><strong>Legal authorities:</strong> When required by law, court order, or to protect the rights and safety of users.</li>
          <li><strong>Business transfers:</strong> In the event of a merger or acquisition, with prior notice to you.</li>
        </ul>

        <h2>6. Data Retention</h2>
        <p>We retain personal data only as long as necessary:</p>
        <ul>
          <li><strong>Active account data:</strong> Retained while your account is active.</li>
          <li><strong>Order records:</strong> 7 years for GST/tax compliance.</li>
          <li><strong>Deleted accounts:</strong> 60-day soft-delete period (you can restore your account); then anonymised within 30 days.</li>
          <li><strong>Marketing consent:</strong> Until withdrawn.</li>
          <li><strong>Security logs:</strong> 90 days.</li>
        </ul>
        <p>See our full <Link href="/policies/data-retention-policy">Data Retention Policy</Link> for details.</p>

        <h2>7. Your Rights</h2>
        <h3>Under DPDP Act 2023 (India)</h3>
        <ul>
          <li>Right to access your personal data.</li>
          <li>Right to correction of inaccurate data.</li>
          <li>Right to erasure (deletion) of data, subject to legal retention obligations.</li>
          <li>Right to nominate a person to exercise rights on your behalf in case of death/incapacity.</li>
          <li>Right to grieve — file a complaint with the Data Protection Board of India.</li>
        </ul>
        <h3>Under GDPR (EU Users)</h3>
        <ul>
          <li>Right of access, rectification, erasure ("right to be forgotten"), and data portability.</li>
          <li>Right to restrict or object to processing.</li>
          <li>Right to withdraw consent at any time.</li>
          <li>Right to lodge a complaint with your local supervisory authority.</li>
        </ul>
        <p>To exercise any of these rights, email <a href="mailto:privacy@buywell.in">privacy@buywell.in</a>. We will respond within 30 days.</p>

        <h2>8. Cookies and Tracking</h2>
        <p>We use strictly necessary cookies for session management and optional analytics cookies. See our <Link href="/policies/cookie-policy">Cookie Policy</Link> for details. You can manage cookie preferences through your browser settings.</p>

        <h2>9. Data Security</h2>
        <p>We implement industry-standard security measures including:</p>
        <ul>
          <li>TLS 1.3 encryption in transit; AES-256 encryption at rest for sensitive fields.</li>
          <li>Password hashing using bcrypt with salt rounds ≥ 12.</li>
          <li>Access controls: employees access only data necessary for their role.</li>
          <li>Regular security audits and vulnerability assessments.</li>
          <li>Incident response plan: affected users notified within 72 hours of a data breach.</li>
        </ul>

        <h2>10. Cross-Border Transfers</h2>
        <p>Your data is primarily stored on servers in Germany (EU) via Hetzner Cloud. Transfers to recipients outside India or the EU are protected by Standard Contractual Clauses (SCCs) or equivalent safeguards as required by applicable law.</p>

        <h2>11. Children&apos;s Privacy</h2>
        <p>BuyWell is not intended for users under the age of 18. We do not knowingly collect personal data from minors. If you believe a minor has provided us data, please contact us immediately for deletion.</p>

        <h2>12. Changes to This Policy</h2>
        <p>We may update this policy periodically. Material changes will be notified via email (if you have an account) and displayed prominently on the site for 30 days before taking effect. Continued use after the effective date constitutes acceptance.</p>
      </div>

      <div className={styles.contactBox}>
        <h3>Privacy Queries & Grievances</h3>
        <p>
          Email: <a href="mailto:privacy@buywell.in">privacy@buywell.in</a><br />
          Grievance Officer: Available via email above (response within 30 days).<br />
          Data Protection Board (India): <a href="https://dpboard.gov.in" target="_blank" rel="noopener noreferrer">dpboard.gov.in</a>
        </p>
      </div>
    </div>
  );
}
