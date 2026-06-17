import type { Metadata } from "next";
import Link from "next/link";
import styles from "../policy.module.css";

export const metadata: Metadata = {
  title: "Data Retention Policy | BuyWell Marketplace",
  description: "How long BuyWell retains your personal data — compliant with DPDP Act 2023 and GDPR.",
};

export default function DataRetentionPolicyPage() {
  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumb}>
        <Link href="/">Home</Link> <span>/</span> <span>Data Retention Policy</span>
      </nav>

      <header className={styles.header}>
        <span className={styles.badge}>Legal</span>
        <h1 className={styles.title}>Data Retention Policy</h1>
        <div className={styles.meta}>
          <span><strong>Effective Date:</strong> 1 June 2025</span>
          <span><strong>Last Updated:</strong> 17 June 2026</span>
          <span><strong>Compliance:</strong> DPDP Act 2023 (India) + GDPR</span>
        </div>
      </header>

      <div className={styles.body}>
        <p>
          BuyWell Marketplace, operated by Qbiqal Technology Solutions, retains personal data only for as long as necessary to fulfil the purposes for which it was collected, or as required by applicable law. This policy sets out our retention periods and disposal practices.
        </p>

        <h2>1. Retention Schedule</h2>

        <h3>Account Data</h3>
        <ul>
          <li><strong>Active accounts:</strong> Retained for the duration of your account&apos;s existence.</li>
          <li><strong>Account deletion request:</strong> A <strong>60-day soft-delete period</strong> applies. Your account is deactivated and inaccessible, but data is preserved for restoration if you change your mind. During this period, you can log in to cancel the deletion.</li>
          <li><strong>After 60 days:</strong> Personal identifiers (name, email, phone) are <strong>anonymised</strong> (replaced with pseudonymous tokens). Your order history is retained in anonymised form for legal compliance.</li>
          <li><strong>Full erasure:</strong> On your written request after the 60-day period, all personally identifiable data is permanently deleted, except records required by law.</li>
        </ul>

        <h3>Order and Transaction Records</h3>
        <ul>
          <li><strong>GST/Tax records:</strong> 7 years from the date of the transaction (required by the Income Tax Act 1961 and GST laws).</li>
          <li><strong>Payment proof uploads:</strong> 2 years, then securely deleted.</li>
          <li><strong>Razorpay transaction logs:</strong> As retained by Razorpay under their data policy; we retain references for 7 years.</li>
        </ul>

        <h3>Address Data</h3>
        <ul>
          <li>Active addresses are retained as long as the account is active.</li>
          <li>Deleted addresses are removed immediately upon customer deletion.</li>
          <li>Address snapshots in orders are retained with order records for 7 years.</li>
        </ul>

        <h3>Reviews and Comments</h3>
        <ul>
          <li>Reviews and blog comments are retained as long as the content is live.</li>
          <li>Upon account deletion, reviews are anonymised (author name replaced with "Verified Buyer").</li>
        </ul>

        <h3>Communication Logs</h3>
        <ul>
          <li><strong>Email logs:</strong> 90 days.</li>
          <li><strong>WhatsApp delivery logs:</strong> 90 days.</li>
          <li><strong>Support queries:</strong> 2 years for quality and dispute resolution purposes.</li>
        </ul>

        <h3>Security and Audit Logs</h3>
        <ul>
          <li><strong>Login logs and IP records:</strong> 90 days.</li>
          <li><strong>Admin action logs:</strong> 1 year.</li>
          <li><strong>Data breach records:</strong> 5 years.</li>
        </ul>

        <h3>Analytics Data</h3>
        <ul>
          <li>Aggregated, anonymised traffic analytics: retained indefinitely for business insights (not personal data).</li>
          <li>No personal data is retained in analytics records.</li>
        </ul>

        <h3>Vendor Data</h3>
        <ul>
          <li>Vendor account data: retained while the vendor account is active + 3 years after closure (for financial and legal records).</li>
          <li>Commission and payout records: 7 years.</li>
        </ul>

        <h2>2. Account Deletion and the 60-Day Restoration Window</h2>
        <p>
          In compliance with the <strong>Digital Personal Data Protection Act, 2023 (DPDP Act)</strong>, customers who request account deletion enter a <strong>60-day restoration period</strong>:
        </p>
        <ul>
          <li>Your account is immediately deactivated — you will not appear in the platform and your data will not be used.</li>
          <li>Within 60 days, you can log in to restore your account with all data intact.</li>
          <li>After 60 days, data anonymisation begins automatically.</li>
          <li>If you want complete erasure before the 60 days, email us at <a href="mailto:privacy@buywell.in">privacy@buywell.in</a> with the subject "Immediate Deletion Request".</li>
        </ul>
        <p>Pending orders at the time of deletion will continue to be fulfilled, and order records retained for legal compliance.</p>

        <h2>3. Data Disposal</h2>
        <ul>
          <li>Digital data is overwritten or cryptographically erased using industry-standard methods.</li>
          <li>Database records are anonymised (pseudonymisation) rather than hard-deleted where retention is legally required.</li>
          <li>We do not retain hard copies of personal data. Any printed documents are shredded.</li>
        </ul>

        <h2>4. Your Right to Erasure</h2>
        <p>Under the DPDP Act 2023 and GDPR, you have the right to request erasure of your personal data. We will comply within 30 days, subject to:</p>
        <ul>
          <li>Legal retention obligations (GST, Income Tax).</li>
          <li>Pending disputes, returns, or investigations.</li>
          <li>Data required for the exercise or defence of legal claims.</li>
        </ul>

        <h2>5. Cross-Border Retention</h2>
        <p>Data stored on EU-based servers (Hetzner, Germany) is subject to both Indian law (DPDP Act) and EU GDPR. Our retention schedules comply with the more stringent of the two where they differ.</p>
      </div>

      <div className={styles.contactBox}>
        <h3>Data Retention Queries</h3>
        <p>Email: <a href="mailto:privacy@buywell.in">privacy@buywell.in</a><br />For immediate deletion requests, include "Immediate Deletion Request" in the subject line.</p>
      </div>
    </div>
  );
}
