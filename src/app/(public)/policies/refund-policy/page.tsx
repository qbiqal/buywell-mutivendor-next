import type { Metadata } from "next";
import Link from "next/link";
import styles from "../policy.module.css";

export const metadata: Metadata = {
  title: "Refund Policy | BuyWell Marketplace",
  description: "BuyWell's refund and return policy — eligibility, timelines, and how to initiate a return.",
};

export default function RefundPolicyPage() {
  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumb}>
        <Link href="/">Home</Link> <span>/</span> <span>Refund Policy</span>
      </nav>

      <header className={styles.header}>
        <span className={styles.badge}>Legal</span>
        <h1 className={styles.title}>Refund &amp; Return Policy</h1>
        <div className={styles.meta}>
          <span><strong>Effective Date:</strong> 1 June 2025</span>
          <span><strong>Last Updated:</strong> 17 June 2026</span>
        </div>
      </header>

      <div className={styles.body}>
        <p>
          At BuyWell Marketplace, we want you to be completely satisfied with every purchase. If you are not, our Refund &amp; Return Policy ensures a fair and transparent resolution. Please read this policy carefully before initiating a return.
        </p>

        <blockquote>
          As per the Consumer Protection Act, 2019 and our marketplace guidelines, all return and refund requests must be initiated within the specified window from the date of delivery.
        </blockquote>

        <h2>1. Return Eligibility</h2>
        <p>You may return a product if:</p>
        <ul>
          <li>The product is <strong>damaged, defective, or broken</strong> upon delivery.</li>
          <li>The product received is <strong>significantly different</strong> from the description or images on the listing.</li>
          <li>The product is <strong>incomplete</strong> (missing parts or accessories as described).</li>
          <li>The product is <strong>expired</strong> (for consumables/health products).</li>
          <li>The product was <strong>not delivered</strong> (lost in transit) — report within 7 days of expected delivery.</li>
        </ul>

        <h3>Non-Returnable Items</h3>
        <ul>
          <li>Perishable goods (fresh food, flowers) unless delivered damaged.</li>
          <li>Customised or personalised products made specifically for you.</li>
          <li>Sealed hygiene products (innerwear, sanitary products) once opened.</li>
          <li>Digital products or downloads after access has been granted.</li>
          <li>Products that have been used, washed, or altered after delivery.</li>
          <li>Products returned without original packaging or accessories.</li>
        </ul>

        <h2>2. Return Window</h2>
        <ul>
          <li><strong>Damaged / Defective:</strong> 7 days from delivery date.</li>
          <li><strong>Wrong product received:</strong> 7 days from delivery date.</li>
          <li><strong>Not as described:</strong> 7 days from delivery date.</li>
          <li><strong>Non-delivery / lost in transit:</strong> 7 days from expected delivery date.</li>
        </ul>
        <p>Requests outside these windows will not be eligible for returns unless the vendor has a specific extended return policy stated on their store page.</p>

        <h2>3. How to Initiate a Return</h2>
        <ol>
          <li>Log in to your BuyWell account and go to <strong>My Orders</strong>.</li>
          <li>Select the relevant order and click <strong>"Request Refund / Return"</strong>.</li>
          <li>Select the reason for return and provide photos of the product if damaged.</li>
          <li>Our team will review your request within <strong>2–3 business days</strong>.</li>
          <li>Upon approval, you will receive return instructions via email or WhatsApp.</li>
          <li>Pack the product securely in its original packaging with all accessories and the order ID written on the box.</li>
          <li>Hand over to the courier partner as instructed, or we will arrange pickup where available.</li>
        </ol>

        <h2>4. Refund Process</h2>
        <ul>
          <li>Refunds are processed to your <strong>original payment method</strong> after the vendor confirms receipt and condition of the returned product.</li>
          <li><strong>Razorpay payments:</strong> Refund within 5–7 business days to your card/UPI/bank account.</li>
          <li><strong>Offline QR / bank transfer:</strong> Refund within 7–10 business days to your registered bank account. You may be asked to share bank details securely.</li>
          <li><strong>BuyWell Wallet credit:</strong> Available as an instant option — refund to BuyWell Wallet within 24–48 hours.</li>
          <li>Shipping charges paid by you are non-refundable unless the return is due to our error or a defective product.</li>
        </ul>

        <h2>5. Exchange Policy</h2>
        <p>We currently offer exchanges only for <strong>size or colour variants</strong> of the same product, subject to availability. To request an exchange, follow the same process as a return and select "Exchange" as the resolution. Additional shipping may apply.</p>

        <h2>6. Damaged During Shipping</h2>
        <p>If your product arrives visibly damaged:</p>
        <ul>
          <li>Do not accept the delivery if the outer packaging is severely damaged — note the refusal with the courier.</li>
          <li>If opened and found damaged, photograph both the packaging and the product before removing further.</li>
          <li>File a return request within 48 hours of delivery with photos attached.</li>
        </ul>

        <h2>7. Vendor-Specific Policies</h2>
        <p>Some vendors may have additional or stricter return policies communicated on their store page. In such cases, the more favourable policy for the customer (between BuyWell&apos;s standard and the vendor&apos;s policy) will apply, as required under the Consumer Protection Act, 2019.</p>

        <h2>8. Disputes</h2>
        <p>If you are unsatisfied with the refund outcome, you can escalate to our Grievance Officer at <a href="mailto:grievance@buywell.in">grievance@buywell.in</a> or file a complaint with the <strong>National Consumer Helpline (1800-11-4000)</strong> or the e-Daakhil portal.</p>
      </div>

      <div className={styles.contactBox}>
        <h3>Refund Support</h3>
        <p>Email: <a href="mailto:support@buywell.in">support@buywell.in</a> | WhatsApp: <a href="tel:+919999999999">+91 99999 99999</a><br />Support hours: Monday–Saturday, 9 AM – 9 PM IST</p>
      </div>
    </div>
  );
}
