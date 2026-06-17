import type { Metadata } from "next";
import Link from "next/link";
import styles from "../policy.module.css";

export const metadata: Metadata = {
  title: "Shipping Policy | BuyWell Marketplace",
  description: "BuyWell's shipping policy — delivery timelines, tracking, charges, and pan-India delivery information.",
};

export default function ShippingPolicyPage() {
  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumb}>
        <Link href="/">Home</Link> <span>/</span> <span>Shipping Policy</span>
      </nav>

      <header className={styles.header}>
        <span className={styles.badge}>Legal</span>
        <h1 className={styles.title}>Shipping Policy</h1>
        <div className={styles.meta}>
          <span><strong>Effective Date:</strong> 1 June 2025</span>
          <span><strong>Last Updated:</strong> 17 June 2026</span>
        </div>
      </header>

      <div className={styles.body}>
        <p>
          BuyWell Marketplace ships products across India through our network of vendor partners and trusted courier services. This Shipping Policy outlines delivery timelines, charges, and important information about receiving your orders.
        </p>

        <h2>1. Shipping Coverage</h2>
        <ul>
          <li>We ship to all <strong>28 states and 8 union territories</strong> in India, including remote and rural pincodes.</li>
          <li>Some remote locations (Andaman &amp; Nicobar Islands, Lakshadweep, high-altitude areas) may have limited delivery options or extended timelines.</li>
          <li>International shipping is not currently available.</li>
        </ul>

        <h2>2. Shipping Charges</h2>
        <ul>
          <li><strong>Free shipping</strong> on orders above ₹499 (applicable for most products).</li>
          <li>For orders below ₹499, a nominal shipping fee of ₹40–₹80 may be charged depending on the vendor and delivery location.</li>
          <li>Exact shipping charges are displayed at checkout before payment.</li>
          <li>Heavy or bulky items may attract additional shipping charges as communicated on the product page.</li>
        </ul>

        <h2>3. Order Processing</h2>
        <ul>
          <li><strong>Dispatch time:</strong> Vendors typically dispatch orders within 1–3 business days of payment confirmation.</li>
          <li>Orders placed on Sundays and public holidays are processed on the next business day.</li>
          <li>You will receive a dispatch confirmation with tracking details via email and/or WhatsApp once the order is shipped.</li>
          <li>During sale events or high-demand periods, dispatch may take 3–5 business days.</li>
        </ul>

        <h2>4. Delivery Timelines</h2>
        <ul>
          <li><strong>Metro cities</strong> (Delhi, Mumbai, Bangalore, Chennai, Hyderabad, Kolkata, Pune, Ahmedabad): 2–4 business days after dispatch.</li>
          <li><strong>Tier-2 and Tier-3 cities:</strong> 3–6 business days after dispatch.</li>
          <li><strong>Remote locations:</strong> 7–10 business days after dispatch.</li>
        </ul>
        <p>These are estimated timelines. Actual delivery may vary due to courier delays, weather conditions, or logistical constraints.</p>

        <h2>5. Order Tracking</h2>
        <ul>
          <li>Once dispatched, a tracking number will be provided via email and in your BuyWell account under <strong>My Orders</strong>.</li>
          <li>You can track your order on the courier partner&apos;s website using the provided tracking number.</li>
          <li>Live tracking updates will also appear in the order timeline on your BuyWell account.</li>
        </ul>

        <h2>6. Delivery Attempts</h2>
        <ul>
          <li>Courier partners make up to <strong>3 delivery attempts</strong> at the provided address.</li>
          <li>If all attempts fail, the package is returned to the vendor. In such cases, you may be eligible for a re-delivery (with an additional shipping charge) or a refund minus shipping costs.</li>
          <li>Ensure your address, floor/apartment number, landmark, and phone number are accurate.</li>
        </ul>

        <h2>7. Damaged or Lost Packages</h2>
        <ul>
          <li><strong>Damaged on delivery:</strong> Do not accept visibly damaged parcels. Note the refusal with the courier. If opened and damaged, report within 48 hours. See our <Link href="/policies/refund-policy">Refund Policy</Link>.</li>
          <li><strong>Lost in transit:</strong> If your order shows as delivered but you did not receive it, report immediately (within 48 hours of the delivery notification) at <a href="mailto:support@buywell.in">support@buywell.in</a>. We will investigate with the courier and resolve within 5–7 business days.</li>
        </ul>

        <h2>8. Multiple Vendor Orders</h2>
        <p>If your order contains products from multiple vendors, they may be shipped separately and arrive at different times. You will receive separate tracking information for each shipment. Shipping charges may vary per vendor.</p>

        <h2>9. Address Changes</h2>
        <p>Address changes are only possible before the vendor dispatches the order. Contact us immediately at <a href="mailto:support@buywell.in">support@buywell.in</a> or via WhatsApp if you need to change your delivery address.</p>

        <h2>10. Packaging</h2>
        <p>Vendors are required to use packaging that adequately protects products during transit. BuyWell encourages eco-friendly packaging. Premium gift packaging may be available for select products at an additional cost.</p>
      </div>

      <div className={styles.contactBox}>
        <h3>Shipping Support</h3>
        <p>Email: <a href="mailto:support@buywell.in">support@buywell.in</a><br />For tracking issues, please have your Order ID ready.</p>
      </div>
    </div>
  );
}
