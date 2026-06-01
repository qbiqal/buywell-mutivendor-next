"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import styles from "./notifications.module.css";

interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationsClient() {
  const { error: showError } = useToast();
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      if (!data.success) {
        showError(data.error ?? "Unable to load notifications");
        return;
      }
      setRows(data.data);
      setUnread(data.unread ?? 0);
    } finally {
      setLoading(false);
    }
  }

  async function markAllRead() {
    setSaving(true);
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      const data = await res.json();
      if (!data.success) {
        showError(data.error ?? "Unable to mark notifications read");
        return;
      }
      await load();
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className={styles.loadingWrap}><Spinner size="lg" /></div>;

  return (
    <div className={styles.content}>
      <div className={styles.header}>
        <div>
          <h1>Notifications</h1>
          <p>{unread} unread</p>
        </div>
        <Button variant="outline" onClick={markAllRead} loading={saving} disabled={rows.length === 0}>
          Mark All Read
        </Button>
      </div>

      <div className={styles.list}>
        {rows.length === 0 ? (
          <div className={styles.empty}>No notifications yet.</div>
        ) : rows.map((row) => (
          <article key={row.id} className={[styles.item, row.isRead ? styles.read : ""].join(" ")}>
            <div className={styles.itemHeader}>
              <h2>{row.title}</h2>
              <Badge variant={row.isRead ? "default" : "success"}>{row.isRead ? "Read" : "New"}</Badge>
            </div>
            <p>{row.body}</p>
            <div className={styles.meta}>
              <span>{new Date(row.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
              {row.link && <Link href={row.link}>Open</Link>}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
