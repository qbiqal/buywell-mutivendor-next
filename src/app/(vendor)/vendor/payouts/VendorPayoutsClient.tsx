"use client";

import { useEffect, useState } from "react";
import styles from "./vendor-payouts.module.css";

interface Payout {
  id: number;
  amount: number;
  status: string;
  paymentMethod: string | null;
  paymentReference: string | null;
  notes: string | null;
  initiatedAt: string;
  paidAt: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  pending:    "#f59e0b",
  processing: "#3b82f6",
  paid:       "#0d7659",
  failed:     "#dc2626",
  cancelled:  "#6b7280",
};

export default function VendorPayoutsClient() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [pendingBalance, setPendingBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/vendor/payouts")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setPayouts(d.payouts);
          setPendingBalance(d.pendingBalance);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Payouts</h1>

      <div className={styles.balanceCard}>
        <div>
          <span className={styles.balanceLabel}>Pending Balance</span>
          <span className={styles.balanceAmt}>₹{(pendingBalance / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
          <p className={styles.balanceNote}>Pending balance is calculated from confirmed orders. Contact support to request a payout.</p>
        </div>
      </div>

      <h2 className={styles.sectionTitle}>Payout History</h2>

      {loading ? (
        <div className={styles.empty}>Loading…</div>
      ) : payouts.length === 0 ? (
        <div className={styles.empty}>No payouts yet.</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr>
              <th>Amount</th>
              <th>Status</th>
              <th>Method</th>
              <th>Reference</th>
              <th>Initiated</th>
              <th>Paid On</th>
            </tr></thead>
            <tbody>
              {payouts.map((p) => {
                const sc = STATUS_COLORS[p.status] ?? "#6b7280";
                return (
                  <tr key={p.id}>
                    <td className={styles.amt}>₹{(p.amount / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                    <td><span className={styles.badge} style={{ color: sc, background: sc + "18" }}>{p.status}</span></td>
                    <td>{p.paymentMethod ?? "—"}</td>
                    <td className={styles.ref}>{p.paymentReference ?? "—"}</td>
                    <td>{new Date(p.initiatedAt).toLocaleDateString("en-IN")}</td>
                    <td>{p.paidAt ? new Date(p.paidAt).toLocaleDateString("en-IN") : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
