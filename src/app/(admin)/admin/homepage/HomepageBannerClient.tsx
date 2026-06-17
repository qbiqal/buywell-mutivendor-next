"use client";
import React, { useEffect, useState } from "react";
import { MediaUploader, type UploadedFile } from "@/components/media/MediaUploader";
import { useToast } from "@/components/ui/Toast";
import styles from "./homepage.module.css";

interface Banner {
  id: number;
  title: string | null;
  subtitle: string | null;
  imageUrl: string;
  mobileImageUrl: string | null;
  linkUrl: string | null;
  linkText: string | null;
  bannerType: string;
  sortOrder: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
}

const EMPTY_FORM = {
  title: "", subtitle: "", imageUrl: "", mobileImageUrl: "",
  linkUrl: "", linkText: "", bannerType: "hero",
  sortOrder: 0, isActive: true,
  startsAt: "", endsAt: "",
};

export function HomepageBannerClient() {
  const toast = useToast();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [activeTab, setActiveTab] = useState<"hero" | "promo">("hero");

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/homepage/banners");
      const d = await r.json();
      if (d.success) setBanners(d.banners);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  function openNew() {
    setEditId(null);
    setForm({ ...EMPTY_FORM, bannerType: activeTab });
    setShowForm(true);
  }

  function openEdit(b: Banner) {
    setEditId(b.id);
    setForm({
      title: b.title ?? "", subtitle: b.subtitle ?? "",
      imageUrl: b.imageUrl, mobileImageUrl: b.mobileImageUrl ?? "",
      linkUrl: b.linkUrl ?? "", linkText: b.linkText ?? "",
      bannerType: b.bannerType, sortOrder: b.sortOrder,
      isActive: b.isActive,
      startsAt: b.startsAt ? b.startsAt.slice(0, 16) : "",
      endsAt: b.endsAt ? b.endsAt.slice(0, 16) : "",
    });
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.imageUrl) { toast.error("Banner image is required"); return; }
    setSaving(true);
    try {
      const url = editId
        ? `/api/admin/homepage/banners/${editId}`
        : "/api/admin/homepage/banners";
      const method = editId ? "PATCH" : "POST";
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          sortOrder: Number(form.sortOrder),
          startsAt: form.startsAt || null,
          endsAt: form.endsAt || null,
        }),
      });
      const d = await r.json();
      if (d.success) {
        toast.success(editId ? "Banner updated" : "Banner created");
        setShowForm(false);
        load();
      } else {
        toast.error(d.error ?? "Save failed");
      }
    } finally { setSaving(false); }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this banner?")) return;
    const r = await fetch(`/api/admin/homepage/banners/${id}`, { method: "DELETE" });
    const d = await r.json();
    if (d.success) { toast.success("Banner deleted"); load(); }
    else toast.error("Delete failed");
  }

  async function toggleActive(b: Banner) {
    await fetch(`/api/admin/homepage/banners/${b.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !b.isActive }),
    });
    load();
  }

  const filtered = banners.filter((b) => b.bannerType === activeTab);

  return (
    <div className={styles.page}>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Homepage Banners</h1>
        <p className="admin-page-subtitle">Manage hero slider and promotional banners shown on the homepage.</p>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button className={[styles.tab, activeTab === "hero" ? styles.tabActive : ""].join(" ")} onClick={() => setActiveTab("hero")}>
          Hero Slider ({banners.filter((b) => b.bannerType === "hero").length})
        </button>
        <button className={[styles.tab, activeTab === "promo" ? styles.tabActive : ""].join(" ")} onClick={() => setActiveTab("promo")}>
          Promo Banners ({banners.filter((b) => b.bannerType === "promo").length})
        </button>
      </div>

      <div className={styles.toolbar}>
        <p className={styles.hint}>
          {activeTab === "hero" ? "Hero banners appear in the right-side slider on the homepage (recommended: 1200×500 px, 12:5 ratio). Auto-crop is applied on upload." : "Promo banners appear in the 2-column row below featured products (recommended: 720×360 px, 2:1 ratio). Auto-crop is applied on upload."}
        </p>
        <button className={styles.addBtn} onClick={openNew}>+ Add Banner</button>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading banners…</div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          <p>No {activeTab} banners yet.</p>
          <button className={styles.addBtn} onClick={openNew}>Add your first banner</button>
        </div>
      ) : (
        <div className={styles.bannerGrid}>
          {filtered.map((b) => (
            <div key={b.id} className={[styles.bannerCard, !b.isActive ? styles.inactive : ""].join(" ")}>
              <div className={styles.bannerThumb}>
                <img src={b.imageUrl} alt={b.title ?? "Banner"} />
                <span className={[styles.badge, b.isActive ? styles.badgeActive : styles.badgeOff].join(" ")}>
                  {b.isActive ? "Active" : "Off"}
                </span>
              </div>
              <div className={styles.bannerMeta}>
                <div className={styles.bannerTitle}>{b.title || <em>No title</em>}</div>
                {b.subtitle && <div className={styles.bannerSubtitle}>{b.subtitle}</div>}
                {b.linkUrl && <div className={styles.bannerLink}>→ {b.linkUrl}</div>}
                <div className={styles.bannerOrder}>Sort: {b.sortOrder}</div>
              </div>
              <div className={styles.bannerActions}>
                <button className={styles.editBtn} onClick={() => openEdit(b)}>Edit</button>
                <button className={styles.toggleBtn} onClick={() => toggleActive(b)}>
                  {b.isActive ? "Deactivate" : "Activate"}
                </button>
                <button className={styles.deleteBtn} onClick={() => handleDelete(b.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>{editId ? "Edit Banner" : "Add Banner"}</h2>
              <button className={styles.closeBtn} onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form onSubmit={handleSave} className={styles.form}>
              {/* Image upload */}
              <div className={styles.field}>
                <label className={styles.label}>Banner Image *</label>
                {form.imageUrl ? (
                  <div className={styles.imagePreview}>
                    <img src={form.imageUrl} alt="Preview" />
                    <button type="button" className={styles.removeImg} onClick={() => setForm((f) => ({ ...f, imageUrl: "" }))}>Remove</button>
                  </div>
                ) : (
                  <MediaUploader
                    onUpload={(files: UploadedFile[]) => setForm((f) => ({ ...f, imageUrl: files[0]?.url ?? "" }))}
                    accept={["image/jpeg", "image/png", "image/webp"]}
                    aspectRatio={form.bannerType === "hero" ? 12 / 5 : 2}
                    recommendedDimensions={
                      form.bannerType === "hero"
                        ? { width: 1200, height: 500, label: "Recommended: 1200×500 px (12:5 ratio) — auto-crop enabled" }
                        : { width: 720, height: 360, label: "Recommended: 720×360 px (2:1 ratio) — auto-crop enabled" }
                    }
                  />
                )}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Mobile Image (optional)</label>
                {form.mobileImageUrl ? (
                  <div className={styles.imagePreview}>
                    <img src={form.mobileImageUrl} alt="Mobile preview" />
                    <button type="button" className={styles.removeImg} onClick={() => setForm((f) => ({ ...f, mobileImageUrl: "" }))}>Remove</button>
                  </div>
                ) : (
                  <MediaUploader
                    onUpload={(files: UploadedFile[]) => setForm((f) => ({ ...f, mobileImageUrl: files[0]?.url ?? "" }))}
                    accept={["image/jpeg", "image/png", "image/webp", "image/gif"]}
                  />
                )}
              </div>

              <div className={styles.row2}>
                <div className={styles.field}>
                  <label className={styles.label}>Title</label>
                  <input className={styles.input} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Banner headline" />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Subtitle</label>
                  <input className={styles.input} value={form.subtitle} onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))} placeholder="Supporting text" />
                </div>
              </div>

              <div className={styles.row2}>
                <div className={styles.field}>
                  <label className={styles.label}>Link URL</label>
                  <input className={styles.input} value={form.linkUrl} onChange={(e) => setForm((f) => ({ ...f, linkUrl: e.target.value }))} placeholder="/shop or https://..." />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Button Text</label>
                  <input className={styles.input} value={form.linkText} onChange={(e) => setForm((f) => ({ ...f, linkText: e.target.value }))} placeholder="Shop Now" />
                </div>
              </div>

              <div className={styles.row3}>
                <div className={styles.field}>
                  <label className={styles.label}>Type</label>
                  <select className={styles.input} value={form.bannerType} onChange={(e) => setForm((f) => ({ ...f, bannerType: e.target.value }))}>
                    <option value="hero">Hero Slider</option>
                    <option value="promo">Promo Banner</option>
                  </select>
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Sort Order</label>
                  <input className={styles.input} type="number" value={form.sortOrder} onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))} />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Active</label>
                  <label className={styles.toggle}>
                    <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
                    <span className={styles.toggleSlider} />
                  </label>
                </div>
              </div>

              <div className={styles.row2}>
                <div className={styles.field}>
                  <label className={styles.label}>Start Date (optional)</label>
                  <input className={styles.input} type="datetime-local" value={form.startsAt} onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))} />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>End Date (optional)</label>
                  <input className={styles.input} type="datetime-local" value={form.endsAt} onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))} />
                </div>
              </div>

              <div className={styles.formActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className={styles.saveBtn} disabled={saving}>
                  {saving ? "Saving…" : editId ? "Save Changes" : "Add Banner"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
