"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import styles from "../workflows.module.css";

type Status = "" | "pending" | "approved" | "rejected" | "spam";

interface ReviewRow {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  status: string;
  likeCount: number;
  createdAt: string;
  productName: string;
  productSlug: string;
  firstName: string;
  lastName: string | null;
  email: string;
}

const TABS: Array<{ key: Status; label: string }> = [
  { key: "", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "spam", label: "Spam" },
  { key: "rejected", label: "Rejected" },
];

export default function ReviewsClient() {
  const { success, error: showError } = useToast();
  const [status, setStatus] = useState<Status>("pending");
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/reviews${status ? `?status=${status}` : ""}`)
      .then((res) => res.json())
      .then((json) => { if (json.success) setRows(json.data); })
      .finally(() => setLoading(false));
  }, [status]);

  async function update(id: string, nextStatus: string) {
    const json = await fetch("/api/admin/reviews", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: nextStatus }),
    }).then((res) => res.json());
    if (!json.success) { showError(json.error ?? "Update failed"); return; }
    success("Review updated");
    setRows((current) => current.map((row) => row.id === id ? { ...row, status: nextStatus } : row));
  }

  return (
    <div className={styles.content}>
      <div className={styles.header}>
        <div>
          <h1 className="admin-page-title">Product Reviews</h1>
          <p className="admin-page-subtitle">Approve ecommerce reviews and handle filtered language.</p>
        </div>
      </div>
      <div className={styles.tabs}>
        {TABS.map((tab) => <button key={tab.key || "all"} className={status === tab.key ? styles.active : ""} onClick={() => setStatus(tab.key)}>{tab.label}</button>)}
      </div>
      {loading ? <Spinner size="lg" /> : rows.length === 0 ? <div className={styles.empty}>No reviews found.</div> : (
        <div className={styles.grid}>
          {rows.map((row) => (
            <article key={row.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <p className={styles.title}>Rating {row.rating}/5 · {row.title || "Review"}</p>
                  <p className={styles.meta}>{row.firstName} {row.lastName ?? ""} · {row.email} · <Link href={`/shop/${row.productSlug}`} target="_blank">{row.productName}</Link></p>
                </div>
                <span className={styles.badge}>{row.status}</span>
              </div>
              <p className={styles.body}>{row.body}</p>
              <p className={styles.meta}>{row.likeCount} likes · {new Date(row.createdAt).toLocaleString("en-IN")}</p>
              <div className={styles.actions}>
                <button className={styles.actionBtn} onClick={() => update(row.id, "approved")}>Approve</button>
                <button className={styles.actionBtn} onClick={() => update(row.id, "rejected")}>Reject</button>
                <button className={styles.actionBtn} onClick={() => update(row.id, "spam")}>Mark Spam</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
