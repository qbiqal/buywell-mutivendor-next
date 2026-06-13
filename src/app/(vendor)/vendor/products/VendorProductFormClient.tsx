"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import { MediaUploader, type UploadedFile } from "@/components/media/MediaUploader";
import styles from "./vendor-product-form.module.css";

interface FormState {
  name: string;
  slug: string;
  category: string;
  description: string;
  sku: string;
  isActive: boolean;
  isFeatured: boolean;
  imageUrl: string;
}

interface Props {
  productId?: string;
}

export default function VendorProductFormClient({ productId }: Props) {
  const router = useRouter();
  const toast = useToast();
  const isEdit = !!productId;

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>({
    name: "", slug: "", category: "", description: "", sku: "",
    isActive: true, isFeatured: false, imageUrl: "",
  });

  useEffect(() => {
    if (!productId) return;
    fetch(`/api/vendor/products/${productId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.product) {
          const p = d.product;
          const primaryImage = (p.images ?? []).find((i: { isPrimary: boolean; url: string }) => i.isPrimary);
          setForm({
            name: p.name ?? "",
            slug: p.slug ?? "",
            category: p.category ?? "",
            description: p.description ?? "",
            sku: p.sku ?? "",
            isActive: p.isActive ?? true,
            isFeatured: p.isFeatured ?? false,
            imageUrl: primaryImage?.url ?? "",
          });
        }
      })
      .finally(() => setLoading(false));
  }, [productId]);

  function set(key: keyof FormState, value: string | boolean) {
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (key === "name" && typeof value === "string") {
        next.slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      }
      return next;
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.sku.trim() || !form.category.trim()) {
      toast.error("Name, SKU, and category are required.");
      return;
    }
    setSaving(true);
    try {
      const url = isEdit ? `/api/vendor/products/${productId}` : "/api/vendor/products";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Save failed."); return; }
      toast.success(isEdit ? "Product updated." : "Product created.");
      router.push("/vendor/products");
    } catch { toast.error("Network error."); }
    finally { setSaving(false); }
  }

  if (loading) return <div className={styles.loading}>Loading…</div>;

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <Link href="/vendor/products" className={styles.back}>← Back to Products</Link>
      </div>
      <h1 className={styles.title}>{isEdit ? "Edit Product" : "Add New Product"}</h1>

      <form onSubmit={handleSave} className={styles.form}>
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Basic Info</h3>
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Product Name *</label>
              <input className={styles.input} value={form.name} onChange={(e) => set("name", e.target.value)} required />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>SKU *</label>
              <input className={styles.input} value={form.sku} onChange={(e) => set("sku", e.target.value)} required />
            </div>
          </div>
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>URL Slug</label>
              <input className={styles.input} value={form.slug} onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Category *</label>
              <input className={styles.input} value={form.category} onChange={(e) => set("category", e.target.value)} placeholder="e.g. Oils, Spices" required />
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Short Description</label>
            <textarea className={styles.textarea} rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} />
          </div>
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Product Image</h3>
          {form.imageUrl && <img src={form.imageUrl} alt="" className={styles.imgPreview} />}
          <MediaUploader
            onUpload={(files: UploadedFile[]) => set("imageUrl", files[0]?.url ?? "")}
            accept={["image/jpeg", "image/png", "image/webp"]}
          />
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Visibility</h3>
          <label className={styles.checkLabel}>
            <input type="checkbox" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} />
            <span>Active (visible in store)</span>
          </label>
          <label className={styles.checkLabel}>
            <input type="checkbox" checked={form.isFeatured} onChange={(e) => set("isFeatured", e.target.checked)} />
            <span>Featured</span>
          </label>
        </div>

        <div className={styles.saveRow}>
          <Link href="/vendor/products" className={styles.cancelBtn}>Cancel</Link>
          <button type="submit" className={styles.saveBtn} disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Product"}
          </button>
        </div>
      </form>
    </div>
  );
}
