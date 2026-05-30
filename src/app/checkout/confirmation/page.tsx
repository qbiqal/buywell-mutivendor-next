"use client";
import React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import styles from "./confirmation.module.css";

export default function ConfirmationPage() {
  const params      = useSearchParams();
  const orderNumber = params.get("orderNumber") ?? "Your Order";

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.icon}>✅</div>
        <h1 className={styles.title}>Payment Proof Submitted!</h1>
        <p className={styles.sub}>
          Order <strong>{orderNumber}</strong> — We've received your payment screenshot.
        </p>
        <div className={styles.steps}>
          <div className={styles.step}>
            <span className={styles.stepNum}>1</span>
            <span>Our team will verify your payment within a few hours.</span>
          </div>
          <div className={styles.step}>
            <span className={styles.stepNum}>2</span>
            <span>You'll receive a WhatsApp confirmation once verified.</span>
          </div>
          <div className={styles.step}>
            <span className={styles.stepNum}>3</span>
            <span>Your order will be packed and shipped within 24–48 hours.</span>
          </div>
        </div>
        <div className={styles.ctas}>
          <Link href="/orders"><Button variant="primary" size="lg">Track My Order</Button></Link>
          <Link href="/shop"><Button variant="ghost">Continue Shopping</Button></Link>
        </div>
        <p className={styles.contact}>
          Questions? WhatsApp us at <a href="https://wa.me/919470309006">+91 9470309006</a>
        </p>
      </div>
    </div>
  );
}
