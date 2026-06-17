import type { Metadata } from "next";
import Link from "next/link";
import styles from "../policy.module.css";

export const metadata: Metadata = {
  title: "Cancellation Policy | BuyWell Marketplace",
  description: "How to cancel an order on BuyWell Marketplace — eligibility, timelines, and refund process.",
};

export default function CancellationPolicyPage() {
  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumb}>
        <Link href="/">Home</Link> <span>/</span> <span>Cancellation Policy</span>
      </nav>

      <header className={styles.header}>
        <span className={styles.badge}>Legal</span>
        <h1 className={styles.title}>Cancellation Policy</h1>
        <div className={styles.meta}>
          <span><strong>Effective Date:</strong> 1 June 2025</span>
          <span><strong>Last Updated:</strong> 17 June 2026</span>
        </div>
      </header>

      <div className={styles.body}>
        <p>
          We understand that plans change. BuyWell Marketplace allows order cancellations within the window specified below. Please read this policy to understand when and how cancellations can be made.
        </p>

        <h2>1. Customer-Initiated Cancellations</h2>
        <ul>
          <li><strong>Before dispatch:</strong> You can cancel any order free of charge before the vendor dispatches it. Log in, go to <strong>My Orders</strong>, and click "Cancel Order".</li>
          <li><strong>After dispatch / in transit:</strong> Cancellation is not possible once the order is dispatched. You may request a return after delivery under our <Link href="/policies/refund-policy">Refund Policy</Link>.</li>
          <li><strong>Offline QR orders awaiting verification:</strong> If payment proof has been uploaded but not yet verified, you can cancel within 2 hours. Contact us immediately at <a href="mailto:hello@buywell.in">hello@buywell.in</a>.</li>
        </ul>

        <h2>2. Partial Cancellations</h2>
        <ul>
          <li>For multi-item orders, you can cancel individual items if they have not yet been dispatched.</li>
          <li>The remaining items will continue to be fulfilled.</li>
          <li>Shipping charges may be recalculated for the remaining items.</li>
        </ul>

        <h2>3. Refunds on Cancellation</h2>
        <ul>
          <li><strong>Razorpay payments:</strong> Full refund to original payment method within 5–7 business days.</li>
          <li><strong>Offline / bank transfer:</strong> Refund within 7–10 business days to your bank account.</li>
          <li><strong>BuyWell Wallet:</strong> Instant credit to your BuyWell Wallet (available as an option).</li>
          <li>No cancellation fee is charged for orders cancelled before dispatch.</li>
        </ul>

        <h2>4. Vendor-Initiated Cancellations</h2>
        <ul>
          <li>Vendors may occasionally cancel orders due to stock unavailability or inability to ship to your location.</li>
          <li>In such cases, you will be notified immediately and receive a full refund within 3–5 business days.</li>
          <li>Repeated vendor-initiated cancellations may result in vendor suspension.</li>
        </ul>

        <h2>5. BuyWell-Initiated Cancellations</h2>
        <p>BuyWell reserves the right to cancel orders in the following situations:</p>
        <ul>
          <li>Suspected fraudulent activity or payment failure.</li>
          <li>Pricing or listing errors.</li>
          <li>Force majeure events (natural disasters, platform outages).</li>
          <li>Violation of our Terms &amp; Conditions.</li>
        </ul>
        <p>A full refund will be issued for BuyWell-cancelled orders.</p>

        <h2>6. How to Cancel</h2>
        <ol>
          <li>Log in to your BuyWell account.</li>
          <li>Go to <strong>My Orders</strong>.</li>
          <li>Select the order you wish to cancel.</li>
          <li>Click <strong>"Cancel Order"</strong> and confirm.</li>
          <li>You will receive a cancellation confirmation and refund initiation notice via email.</li>
        </ol>
        <p>If the cancellation option is not visible (because the order is already dispatched), please contact us for a return-after-delivery option.</p>
      </div>

      <div className={styles.contactBox}>
        <h3>Cancellation Support</h3>
        <p>Email: <a href="mailto:hello@buywell.in">hello@buywell.in</a> | WhatsApp: <a href="tel:+919470309006">+91 94703 09006</a><br />For urgent cancellations, contact us as soon as possible.</p>
      </div>
    </div>
  );
}
