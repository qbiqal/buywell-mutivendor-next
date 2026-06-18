"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { formatDateTime } from "@/lib/utils";
import type { CmsPage } from "@/lib/db/schema";
import styles from "./cms-pages.module.css";

export default function AdminCMSPagesClient() {
  const { success, error: showError } = useToast();
  const [pages, setPages] = useState<CmsPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{open: boolean; title: string; message: string; onConfirm: () => void}>({open: false, title: "", message: "", onConfirm: () => {}});

  function openConfirm(title: string, message: string): Promise<boolean> {
    return new Promise((resolve) => {
      setConfirmState({ open: true, title, message, onConfirm: () => { setConfirmState(s => ({...s, open: false})); resolve(true); } });
    });
  }

  useEffect(() => {
    loadPages();
  }, []);

  async function loadPages() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/cms/pages");
      const json = await res.json();
      if (json.success) setPages(json.data);
    } finally {
      setLoading(false);
    }
  }

  async function deletePage(id: string) {
    if (!(await openConfirm("Delete CMS Page", "Delete this page? Menu links pointing to it will no longer resolve to a page record."))) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/cms/pages/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) {
        showError(json.error ?? "Delete failed");
        return;
      }
      success("CMS page deleted");
      setPages((current) => current.filter((page) => page.id !== id));
    } finally {
      setDeleting(null);
    }
  }

  if (loading) return <div className={styles.loadingWrap}><Spinner size="lg" /></div>;

  return (
    <div className={styles.content}>
      <div className={styles.header}>
        <div>
          <h1 className="admin-page-title">CMS Pages</h1>
          <p className="admin-page-subtitle">Create publishable pages and assign them to header or footer menus</p>
        </div>
        <Link href="/admin/cms/pages/new">
          <Button variant="primary">New Page</Button>
        </Link>
      </div>

      <div className={styles.pageList}>
        {pages.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No CMS pages yet.</p>
            <Link href="/admin/cms/pages/new">Create your first page</Link>
          </div>
        ) : pages.map((page) => (
          <div key={page.id} className={styles.pageRow}>
            <div className={styles.pageMain}>
              <div className={styles.titleLine}>
                <h2>{page.title}</h2>
                <Badge variant={page.status === "published" ? "success" : page.status === "archived" ? "default" : "amber"}>
                  {page.status}
                </Badge>
              </div>
              <div className={styles.metaLine}>
                <span>/{page.slug}</span>
                <span>Updated {formatDateTime(page.updatedAt)}</span>
              </div>
            </div>
            <div className={styles.actions}>
              {page.status === "published" && (
                <a href={`/${page.slug}`} target="_blank" rel="noopener noreferrer" className={styles.previewLink}>Preview</a>
              )}
              <Link href={`/admin/cms/pages/${page.id}/edit`} className={styles.editLink}>Edit</Link>
              <button
                type="button"
                className={styles.deleteBtn}
                disabled={deleting === page.id}
                onClick={() => deletePage(page.id)}
              >
                {deleting === page.id ? "..." : "Delete"}
              </button>
            </div>
          </div>
        ))}
      </div>
      <ConfirmModal
        isOpen={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState(s => ({...s, open: false}))}
        variant="danger"
      />
    </div>
  );
}
