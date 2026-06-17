"use client";
import React, { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import styles from "./confirmation.module.css";

function ConfirmationContent() {
  const params      = useSearchParams();
  const orderNumber = params.get("orderNumber") ?? "Your Order";
  const method      = params.get("method") ?? "wallet";

  const isOffline = method === "offline_qr";

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.icon}>{isOffline ? "📋" : "🎉"}</div>
        <h1 className={styles.title}>
          {isOffline ? "Payment Proof Submitted!" : "Order Confirmed!"}
        </h1>
        <p className={styles.sub}>
          Order <strong>{orderNumber}</strong> —{" "}
          {isOffline
            ? "We've received your payment screenshot. Our team will verify it shortly."
            : "Your payment was successful and your order is being processed."}
        </p>
        <div className={styles.steps}>
          {isOffline ? (
            <>
              <div className={styles.step}>
                <span className={styles.stepNum}>1</span>
                <span>Our team will verify your payment within a few hours.</span>
              </div>
              <div className={styles.step}>
                <span className={styles.stepNum}>2</span>
                <span>You&apos;ll receive a WhatsApp confirmation once verified.</span>
              </div>
              <div className={styles.step}>
                <span className={styles.stepNum}>3</span>
                <span>Your order will be packed and shipped within 24–48 hours.</span>
              </div>
            </>
          ) : (
            <>
              <div className={styles.step}>
                <span className={styles.stepNum}>1</span>
                <span>Payment received — your order is confirmed and queued for processing.</span>
              </div>
              <div className={styles.step}>
                <span className={styles.stepNum}>2</span>
                <span>You&apos;ll receive a WhatsApp update once your order is packed.</span>
              </div>
              <div className={styles.step}>
                <span className={styles.stepNum}>3</span>
                <span>Delivery within 3–5 business days after dispatch.</span>
              </div>
            </>
          )}
        </div>
        <div className={styles.ctas}>
          <Link href="/orders"><Button variant="primary" size="lg">Track My Order</Button></Link>
          <Link href="/shop"><Button variant="ghost">Continue Shopping</Button></Link>
        </div>
        <p className={styles.contact}>
          Questions? WhatsApp us at <a href="https://wa.me/919999999999">+91 9999999999</a>
        </p>
      </div>
    </div>
  );
}

export default function ConfirmationClient() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh" }} />}>
      <ConfirmationContent />
    </Suspense>
  );
}
