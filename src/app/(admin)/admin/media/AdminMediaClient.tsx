"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { formatDateTime } from "@/lib/utils";
import { MediaUploader, type UploadedFile } from "@/components/media/MediaUploader";
import styles from "./admin-media.module.css";

interface MediaReference {
  type: "product" | "blog" | "cms" | "config";
  label: string;
  href?: string;
}

interface MediaItem {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  thumbnailUrl: string | null;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  alt: string | null;
  folder: string;
  storage: string;
  createdAt: string;
  referenceCount: number;
  references: MediaReference[];
}

interface FolderFilter {
  folder: string;
  count: number;
}

const TYPE_OPTIONS = [
  { value: "", label: "All files" },
  { value: "image", label: "Images" },
  { value: "video", label: "Videos" },
];

const LIMIT = 24;

export default function AdminMediaClient() {
  const { success, error: showError } = useToast();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [folders, setFolders] = useState<FolderFilter[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [folder, setFolder] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [preview, setPreview] = useState<MediaItem | null>(null);
  const [editing, setEditing] = useState<MediaItem | null>(null);
  const [editForm, setEditForm] = useState({ alt: "", folder: "general" });
  const [saving, setSaving] = useState(false);
  const [confirmState, setConfirmState] = useState<{open: boolean; title: string; message: string; onConfirm: () => void}>({open: false, title: "", message: "", onConfirm: () => {}});

  function openConfirm(title: string, message: string): Promise<boolean> {
    return new Promise((resolve) => {
      setConfirmState({ open: true, title, message, onConfirm: () => { setConfirmState(s => ({...s, open: false})); resolve(true); } });
    });
  }

  useEffect(() => {
    loadMedia();
  }, [search, folder, type, page]);

  function loadMedia() {
    setLoading(true);
    const q = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    if (search) q.set("search", search);
    if (folder) q.set("folder", folder);
    if (type) q.set("type", type);
    fetch(`/api/admin/media?${q}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setItems(d.data);
          setFolders(d.filters.folders);
          setTotal(d.pagination.total);
        }
      })
      .finally(() => setLoading(false));
  }

  function onUploaded(files: UploadedFile[]) {
    if (files.length > 0) {
      success(`${files.length} file${files.length === 1 ? "" : "s"} uploaded`);
      setUploadOpen(false);
      setPage(1);
      loadMedia();
    }
  }

  function openEdit(item: MediaItem) {
    setEditing(item);
    setEditForm({ alt: item.alt ?? "", folder: item.folder });
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/media/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!data.success) {
        showError(data.error ?? "Media update failed");
        return;
      }
      success("Media updated");
      setEditing(null);
      loadMedia();
    } finally {
      setSaving(false);
    }
  }

  async function deleteMedia(item: MediaItem) {
    if (item.referenceCount > 0) {
      showError("Remove references before deleting this file");
      return;
    }
    if (!(await openConfirm("Delete File", `Delete "${item.originalName}"? This cannot be undone.`))) return;
    const res = await fetch(`/api/admin/media/${item.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!data.success) {
      showError(data.error ?? "Delete failed");
      return;
    }
    success("Media deleted");
    setItems((rows) => rows.filter((row) => row.id !== item.id));
    setTotal((current) => Math.max(0, current - 1));
  }

  async function copyUrl(url: string) {
    await navigator.clipboard.writeText(url);
    success("URL copied");
  }

  const pages = Math.ceil(total / LIMIT);

  return (
    <div className={styles.content}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className="admin-page-title">Media Library</h1>
          <p className="admin-page-subtitle">{total} file{total === 1 ? "" : "s"} total</p>
        </div>
        <Button variant="primary" onClick={() => setUploadOpen(true)}>Upload</Button>
      </div>

      <div className={styles.filters}>
        <Input
          placeholder="Search filename, alt, or folder..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className={styles.searchInput}
        />
        <Select
          value={folder}
          onChange={(e) => { setFolder(e.target.value); setPage(1); }}
          options={[{ value: "", label: "All folders" }, ...folders.map((f) => ({ value: f.folder, label: `${f.folder} (${f.count})` }))]}
          className={styles.selectInput}
        />
        <Select
          value={type}
          onChange={(e) => { setType(e.target.value); setPage(1); }}
          options={TYPE_OPTIONS}
          className={styles.selectInput}
        />
        <div className={styles.viewToggle} aria-label="View mode">
          <button type="button" className={view === "grid" ? styles.activeToggle : ""} onClick={() => setView("grid")}>Grid</button>
          <button type="button" className={view === "list" ? styles.activeToggle : ""} onClick={() => setView("list")}>List</button>
        </div>
      </div>

      {loading ? (
        <div className={styles.loadingWrap}><Spinner size="lg" /></div>
      ) : items.length === 0 ? (
        <div className={styles.empty}>
          <p>No media found.</p>
          <Button variant="secondary" onClick={() => setUploadOpen(true)}>Upload File</Button>
        </div>
      ) : view === "grid" ? (
        <div className={styles.grid}>
          {items.map((item) => (
            <MediaCard
              key={item.id}
              item={item}
              onPreview={() => setPreview(item)}
              onCopy={() => copyUrl(item.url)}
              onEdit={() => openEdit(item)}
              onDelete={() => deleteMedia(item)}
            />
          ))}
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>File</th>
                <th>Folder</th>
                <th>Type</th>
                <th>Size</th>
                <th>References</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className={styles.fileCell}>
                      <button type="button" className={styles.thumbMini} onClick={() => setPreview(item)}>
                        <MediaPreview item={item} />
                      </button>
                      <div>
                        <p className={styles.fileName}>{item.originalName}</p>
                        <p className={styles.fileMeta}>{item.alt || item.filename}</p>
                      </div>
                    </div>
                  </td>
                  <td><Badge variant="info">{item.folder}</Badge></td>
                  <td>{item.mimeType}</td>
                  <td>{formatBytes(item.sizeBytes)}</td>
                  <td>{item.referenceCount}</td>
                  <td>{formatDateTime(item.createdAt)}</td>
                  <td>
                    <div className={styles.actions}>
                      <button type="button" onClick={() => copyUrl(item.url)}>Copy</button>
                      <button type="button" onClick={() => openEdit(item)}>Edit</button>
                      <button type="button" onClick={() => deleteMedia(item)} disabled={item.referenceCount > 0}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className={styles.pagination}>
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className={styles.pageBtn}>Prev</button>
          <span className={styles.pageInfo}>Page {page} of {pages}</span>
          <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages} className={styles.pageBtn}>Next</button>
        </div>
      )}

      <Modal isOpen={uploadOpen} onClose={() => setUploadOpen(false)} title="Upload Media" maxWidth="720px">
        <MediaUploader
          folder={folder || "general"}
          multiple
          maxFiles={8}
          maxSizeMb={100}
          accept={["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm"]}
          onUpload={onUploaded}
        />
      </Modal>

      <Modal isOpen={Boolean(preview)} onClose={() => setPreview(null)} title={preview?.originalName} maxWidth="920px">
        {preview && (
          <div className={styles.previewModal}>
            <div className={styles.previewStage}><MediaPreview item={preview} large /></div>
            <div className={styles.previewDetails}>
              <p><strong>URL</strong><span>{preview.url}</span></p>
              <p><strong>Folder</strong><span>{preview.folder}</span></p>
              <p><strong>Size</strong><span>{formatBytes(preview.sizeBytes)}</span></p>
              <p><strong>References</strong><span>{preview.referenceCount}</span></p>
              {preview.references.length > 0 && (
                <div className={styles.references}>
                  {preview.references.map((ref, index) => ref.href ? (
                    <Link key={`${ref.type}-${index}`} href={ref.href}>{ref.label}</Link>
                  ) : (
                    <span key={`${ref.type}-${index}`}>{ref.label}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={Boolean(editing)} onClose={() => setEditing(null)} title="Edit Media" maxWidth="560px">
        <div className={styles.editForm}>
          <Input
            label="Alt Text"
            value={editForm.alt}
            onChange={(e) => setEditForm((current) => ({ ...current, alt: e.target.value }))}
          />
          <Input
            label="Folder"
            value={editForm.folder}
            onChange={(e) => setEditForm((current) => ({ ...current, folder: e.target.value }))}
          />
          <Button variant="primary" loading={saving} onClick={saveEdit}>Save Changes</Button>
        </div>
      </Modal>
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

function MediaCard({
  item,
  onPreview,
  onCopy,
  onEdit,
  onDelete,
}: {
  item: MediaItem;
  onPreview: () => void;
  onCopy: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className={styles.card}>
      <button type="button" className={styles.thumb} onClick={onPreview}>
        <MediaPreview item={item} />
      </button>
      <div className={styles.cardBody}>
        <div className={styles.cardTitleRow}>
          <p className={styles.fileName}>{item.originalName}</p>
          <Badge variant={item.referenceCount > 0 ? "warning" : "success"}>{item.referenceCount} ref</Badge>
        </div>
        <p className={styles.fileMeta}>{item.folder} · {formatBytes(item.sizeBytes)}</p>
        <div className={styles.actions}>
          <button type="button" onClick={onCopy}>Copy</button>
          <button type="button" onClick={onEdit}>Edit</button>
          <button type="button" onClick={onDelete} disabled={item.referenceCount > 0}>Delete</button>
        </div>
      </div>
    </div>
  );
}

function MediaPreview({ item, large = false }: { item: MediaItem; large?: boolean }) {
  if (item.mimeType.startsWith("video/")) {
    return (
      <video
        src={item.url}
        controls={large}
        muted={!large}
        className={large ? styles.previewVideo : styles.previewMedia}
      />
    );
  }
  return (
    <img
      src={item.thumbnailUrl ?? item.url}
      alt={item.alt ?? item.originalName}
      className={large ? styles.previewImage : styles.previewMedia}
    />
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
