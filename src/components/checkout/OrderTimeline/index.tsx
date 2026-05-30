import React from "react";
import type { OrderStatus } from "@/types";
import styles from "./OrderTimeline.module.css";

const STAGES: { status: OrderStatus; label: string; icon: string }[] = [
  { status: "pending",          label: "Order Placed",       icon: "📋" },
  { status: "payment_uploaded", label: "Payment Uploaded",   icon: "📸" },
  { status: "payment_verified", label: "Payment Verified",   icon: "✅" },
  { status: "confirmed",        label: "Order Confirmed",    icon: "🎉" },
  { status: "processing",       label: "Processing",         icon: "📦" },
  { status: "shipped",          label: "Shipped",            icon: "🚚" },
  { status: "delivered",        label: "Delivered",          icon: "🏠" },
];

const STATUS_ORDER: OrderStatus[] = [
  "pending", "payment_pending", "payment_uploaded", "payment_verified",
  "confirmed", "processing", "shipped", "delivered",
];

interface TimelineProps {
  currentStatus: OrderStatus;
  history?: Array<{ status: string; createdAt: Date | string; note?: string | null }>;
}

export function OrderTimeline({ currentStatus, history = [] }: TimelineProps) {
  const currentIdx = STATUS_ORDER.indexOf(currentStatus);
  const isCancelled = currentStatus === "cancelled";

  return (
    <div className={styles.timeline}>
      {STAGES.map((stage, i) => {
        const stageIdx = STATUS_ORDER.indexOf(stage.status);
        const isDone    = !isCancelled && currentIdx >= stageIdx;
        const isCurrent = !isCancelled && currentIdx === stageIdx;
        const histEntry = history.find((h) => h.status === stage.status);

        return (
          <div key={stage.status} className={[styles.step, isDone ? styles.done : "", isCurrent ? styles.current : ""].join(" ")}>
            <div className={styles.indicator}>
              <div className={styles.dot}>
                {isDone ? <span className={styles.check}>✓</span> : <span className={styles.num}>{i + 1}</span>}
              </div>
              {i < STAGES.length - 1 && <div className={[styles.line, isDone ? styles.lineDone : ""].join(" ")} />}
            </div>
            <div className={styles.content}>
              <div className={styles.icon}>{stage.icon}</div>
              <div>
                <p className={styles.label}>{stage.label}</p>
                {histEntry && (
                  <p className={styles.date}>
                    {new Date(histEntry.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}{" "}
                    {new Date(histEntry.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    {histEntry.note && <span className={styles.note}> — {histEntry.note}</span>}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {isCancelled && (
        <div className={[styles.step, styles.cancelled].join(" ")}>
          <div className={styles.indicator}><div className={styles.dot}><span>✕</span></div></div>
          <div className={styles.content}>
            <div className={styles.icon}>❌</div>
            <div><p className={styles.label}>Order Cancelled</p></div>
          </div>
        </div>
      )}
    </div>
  );
}
