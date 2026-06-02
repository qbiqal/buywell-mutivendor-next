"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import styles from "../../workflows.module.css";

type Status = "" | "pending" | "approved" | "rejected" | "spam";

interface CommentRow {
  id: string;
  body: string;
  status: string;
  likeCount: number;
  createdAt: string;
  postTitle: string;
  postSlug: string;
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

export default function BlogCommentsClient() {
  const { success, error: showError } = useToast();
  const [status, setStatus] = useState<Status>("pending");
  const [rows, setRows] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load(nextStatus = status) {
    setLoading(true);
    const query = nextStatus ? `?status=${nextStatus}` : "";
    const json = await fetch(`/api/admin/blog/comments${query}`).then((res) => res.json());
    if (json.success) setRows(json.data);
    setLoading(false);
  }

  useEffect(() => { load(status).catch(() => setLoading(false)); }, [status]);

  async function setCommentStatus(id: string, nextStatus: string) {
    const json = await fetch("/api/admin/blog/comments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: nextStatus }),
    }).then((res) => res.json());
    if (!json.success) { showError(json.error ?? "Update failed"); return; }
    success("Comment updated");
    setRows((current) => current.map((row) => row.id === id ? { ...row, status: nextStatus } : row));
  }

  return (
    <div className={styles.content}>
      <div className={styles.header}>
        <div>
          <h1 className="admin-page-title">Blog Comments</h1>
          <p className="admin-page-subtitle">Approve member comments, replies, likes, and filtered spam.</p>
        </div>
      </div>
      <div className={styles.tabs}>
        {TABS.map((tab) => (
          <button key={tab.key || "all"} className={status === tab.key ? styles.active : ""} onClick={() => setStatus(tab.key)}>
            {tab.label}
          </button>
        ))}
      </div>
      {loading ? <Spinner size="lg" /> : rows.length === 0 ? <div className={styles.empty}>No comments found.</div> : (
        <div className={styles.grid}>
          {rows.map((row) => (
            <article key={row.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <p className={styles.title}>{row.firstName} {row.lastName ?? ""}</p>
                  <p className={styles.meta}>{row.email} · <Link href={`/blog/${row.postSlug}`} target="_blank">{row.postTitle}</Link> · {new Date(row.createdAt).toLocaleString("en-IN")}</p>
                </div>
                <span className={styles.badge}>{row.status}</span>
              </div>
              <p className={styles.body}>{row.body}</p>
              <p className={styles.meta}>{row.likeCount} likes</p>
              <div className={styles.actions}>
                <button className={styles.actionBtn} onClick={() => setCommentStatus(row.id, "approved")}>Approve</button>
                <button className={styles.actionBtn} onClick={() => setCommentStatus(row.id, "rejected")}>Reject</button>
                <button className={styles.actionBtn} onClick={() => setCommentStatus(row.id, "spam")}>Mark Spam</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
