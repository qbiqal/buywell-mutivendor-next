"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import styles from "../workflows.module.css";

type Status = "" | "requested" | "under_review" | "approved" | "rejected" | "processed" | "cancelled";

interface RefundRow {
  id: string;
  orderId: string;
  orderNumber: string;
  customerEmail: string | null;
  requestedAmountInr: number;
  approvedAmountInr: number | null;
  reason: string;
  customerNote: string | null;
  adminNote: string | null;
  status: string;
  refundMethod: string | null;
  refundReference: string | null;
  requestedAt: string;
  processedAt: string | null;
}

const TABS: Array<{ key: Status; label: string }> = [
  { key: "", label: "All" },
  { key: "requested", label: "Requested" },
  { key: "under_review", label: "Under Review" },
  { key: "approved", label: "Approved" },
  { key: "processed", label: "Processed" },
  { key: "rejected", label: "Rejected" },
];

export default function RefundsClient() {
  const { success, error: showError } = useToast();
  const [status, setStatus] = useState<Status>("requested");
  const [rows, setRows] = useState<RefundRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/refunds${status ? `?status=${status}` : ""}`)
      .then((res) => res.json())
      .then((json) => { if (json.success) setRows(json.data); })
      .finally(() => setLoading(false));
  }, [status]);

  async function update(row: RefundRow, nextStatus: string) {
    const approved = prompt("Approved refund amount in paise", String(row.approvedAmountInr ?? row.requestedAmountInr));
    if (approved === null) return;
    const adminNote = prompt("Admin note", row.adminNote ?? "") ?? "";
    const refundReference = nextStatus === "processed" ? prompt("Refund reference", row.refundReference ?? "") ?? "" : row.refundReference ?? "";
    const json = await fetch("/api/admin/refunds", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: row.id,
        status: nextStatus,
        approvedAmountInr: Number(approved),
        adminNote,
        refundReference,
        refundMethod: nextStatus === "processed" ? "manual" : row.refundMethod,
      }),
    }).then((res) => res.json());
    if (!json.success) { showError(json.error ?? "Refund update failed"); return; }
    success("Refund updated");
    setRows((current) => current.map((item) => item.id === row.id ? { ...item, ...json.data } : item));
  }

  return (
    <div className={styles.content}>
      <div className={styles.header}>
        <div>
          <h1 className="admin-page-title">Refund Management</h1>
          <p className="admin-page-subtitle">Review, approve, reject, and process ecommerce refunds.</p>
        </div>
      </div>
      <div className={styles.tabs}>
        {TABS.map((tab) => <button key={tab.key || "all"} className={status === tab.key ? styles.active : ""} onClick={() => setStatus(tab.key)}>{tab.label}</button>)}
      </div>
      {loading ? <Spinner size="lg" /> : rows.length === 0 ? <div className={styles.empty}>No refunds found.</div> : (
        <table className={styles.table}>
          <thead><tr><th>Order</th><th>Customer</th><th>Amount</th><th>Status</th><th>Reason</th><th>Actions</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td><Link href={`/admin/orders/${row.orderId}`}>{row.orderNumber}</Link><br /><span className={styles.meta}>{new Date(row.requestedAt).toLocaleString("en-IN")}</span></td>
                <td>{row.customerEmail ?? "Guest"}</td>
                <td>Requested: Rs {(row.requestedAmountInr / 100).toFixed(2)}<br />Approved: Rs {((row.approvedAmountInr ?? 0) / 100).toFixed(2)}</td>
                <td><span className={styles.badge}>{row.status}</span></td>
                <td>{row.reason}<br /><span className={styles.meta}>{row.customerNote}</span></td>
                <td>
                  <div className={styles.actions}>
                    <button className={styles.actionBtn} onClick={() => update(row, "under_review")}>Review</button>
                    <button className={styles.actionBtn} onClick={() => update(row, "approved")}>Approve</button>
                    <button className={styles.actionBtn} onClick={() => update(row, "processed")}>Process</button>
                    <button className={styles.actionBtn} onClick={() => update(row, "rejected")}>Reject</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
