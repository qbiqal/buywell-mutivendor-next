"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
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

interface Variant {
  id: string;
  name: string;
  priceInr: number;
  mrpInr: number | null;
  stock: number;
  weight: string | null;
  sku: string;
  imageUrl?: string | null;
}

interface NewVariantState {
  name: string;
  priceInr: string;
  mrpInr: string;
  stock: string;
  weight: string;
  sku: string;
  imageUrl: string;
}

interface Props {
  productId?: string;
}

const EMPTY_VARIANT: NewVariantState = { name: "", priceInr: "", mrpInr: "", stock: "0", weight: "", sku: "", imageUrl: "" };

export default function VendorProductFormClient({ productId }: Props) {
  const router = useRouter();
  const toast = useToast();
  const isEdit = !!productId;

  const [loading,  setLoading]  = useState(isEdit);
  const [saving,   setSaving]   = useState(false);
  const [form, setForm] = useState<FormState>({
    name: "", slug: "", category: "", description: "", sku: "",
    isActive: true, isFeatured: false, imageUrl: "",
  });

  // Variant state
  const [variants,      setVariants]      = useState<Variant[]>([]);
  const [addingVariant, setAddingVariant] = useState(false);
  const [savingVariant, setSavingVariant] = useState(false);
  const [newVariant,    setNewVariant]    = useState<NewVariantState>(EMPTY_VARIANT);
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [editVariantForm,  setEditVariantForm]  = useState<NewVariantState>({ ...EMPTY_VARIANT });
  const [confirmState, setConfirmState] = useState<{open: boolean; title: string; message: string; onConfirm: () => void}>({open: false, title: "", message: "", onConfirm: () => {}});
  const [hsnCode,     setHsnCode]     = useState("");
  const [taxRateId,   setTaxRateId]   = useState<number | "">("");
  const [taxRates,    setTaxRates]    = useState<Array<{ id: number; name: string; cgstRate: number; sgstRate: number; igstRate: number }>>([]);
  const [hsnSearch,   setHsnSearch]   = useState("");
  const [hsnResults,  setHsnResults]  = useState<Array<{ id: number; code: string; description: string; taxRateId: number | null }>>([]);
  const [hsnDropdown, setHsnDropdown] = useState(false);

  useEffect(() => {
    fetch("/api/vendor/tax/rates").then(r => r.json()).then(d => { if (d.success) setTaxRates(d.rates); });
  }, []);

  useEffect(() => {
    if (!hsnSearch || hsnSearch.length < 2) { setHsnResults([]); setHsnDropdown(false); return; }
    const t = setTimeout(() => {
      fetch(`/api/vendor/tax/hsn-codes?search=${encodeURIComponent(hsnSearch)}&limit=10`)
        .then(r => r.json()).then(d => { if (d.success) { setHsnResults(d.codes); setHsnDropdown(d.codes.length > 0); } });
    }, 300);
    return () => clearTimeout(t);
  }, [hsnSearch]);

  function openConfirm(title: string, message: string): Promise<boolean> {
    return new Promise((resolve) => {
      setConfirmState({ open: true, title, message, onConfirm: () => { setConfirmState(s => ({...s, open: false})); resolve(true); } });
    });
  }

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
          setVariants(p.variants ?? []);
          setHsnCode(p.hsnCode ?? "");
          setHsnSearch(p.hsnCode ?? "");
          setTaxRateId(p.taxRateId ?? "");
        }
      })
      .finally(() => setLoading(false));
  }, [productId]);

  function set(key: keyof FormState, value: string | boolean) {
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (key === "name" && typeof value === "string") {
        next.slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        if (!next.sku) next.sku = next.slug.toUpperCase().slice(0, 12);
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
      const url    = isEdit ? `/api/vendor/products/${productId}` : "/api/vendor/products";
      const method = isEdit ? "PATCH" : "POST";
      const res    = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, hsnCode: hsnCode || null, taxRateId: taxRateId !== "" ? Number(taxRateId) : null }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Save failed."); return; }
      if (isEdit) {
        toast.success("Product updated.");
        router.push("/vendor/products");
      } else {
        // Redirect to edit page so vendor can add variants immediately
        toast.success("Product created. Add variants below.");
        router.push(`/vendor/products/${data.product.id}`);
      }
    } catch { toast.error("Network error."); }
    finally { setSaving(false); }
  }

  async function handleAddVariant() {
    if (!productId) return;
    if (!newVariant.name.trim() || !newVariant.sku.trim() || !newVariant.priceInr) {
      toast.error("Variant name, SKU, and price are required.");
      return;
    }
    setSavingVariant(true);
    try {
      const res = await fetch(`/api/vendor/products/${productId}/variants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:     newVariant.name.trim(),
          sku:      newVariant.sku.trim(),
          priceInr: Math.round(parseFloat(newVariant.priceInr) * 100),
          mrpInr:   newVariant.mrpInr ? Math.round(parseFloat(newVariant.mrpInr) * 100) : null,
          stock:    parseInt(newVariant.stock || "0", 10),
          weight:   newVariant.weight.trim() || null,
          imageUrl: newVariant.imageUrl?.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Failed to add variant."); return; }
      setVariants((v) => [...v, data.variant]);
      setNewVariant(EMPTY_VARIANT);
      setAddingVariant(false);
      toast.success("Variant added.");
    } catch { toast.error("Network error."); }
    finally { setSavingVariant(false); }
  }

  async function handleDeleteVariant(variantId: string) {
    if (!productId || !(await openConfirm("Remove Variant", "Are you sure you want to remove this variant? This cannot be undone."))) return;
    const res = await fetch(`/api/vendor/products/${productId}/variants/${variantId}`, { method: "DELETE" });
    if (res.ok) {
      setVariants((v) => v.filter((x) => x.id !== variantId));
      toast.success("Variant removed.");
    } else {
      toast.error("Failed to remove variant.");
    }
  }

  function startEditVariant(v: Variant) {
    setEditingVariantId(v.id);
    setEditVariantForm({
      name:     v.name,
      sku:      v.sku,
      priceInr: String(v.priceInr / 100),
      mrpInr:   v.mrpInr != null ? String(v.mrpInr / 100) : "",
      stock:    String(v.stock),
      weight:   v.weight ?? "",
      imageUrl: v.imageUrl ?? "",
    });
  }

  async function handleSaveVariantEdit(variantId: string) {
    if (!productId) return;
    setSavingVariant(true);
    try {
      const res = await fetch(`/api/vendor/products/${productId}/variants/${variantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:     editVariantForm.name.trim(),
          sku:      editVariantForm.sku.trim(),
          priceInr: Math.round(parseFloat(editVariantForm.priceInr) * 100),
          mrpInr:   editVariantForm.mrpInr ? Math.round(parseFloat(editVariantForm.mrpInr) * 100) : null,
          stock:    parseInt(editVariantForm.stock || "0", 10),
          weight:   editVariantForm.weight.trim() || null,
          imageUrl: editVariantForm.imageUrl?.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Update failed."); return; }
      setVariants((v) => v.map((x) => x.id === variantId ? data.variant : x));
      setEditingVariantId(null);
      toast.success("Variant updated.");
    } catch { toast.error("Network error."); }
    finally { setSavingVariant(false); }
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

        {/* Tax & GST */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Tax &amp; GST</h3>
          <div className={styles.field} style={{ position: "relative" }}>
            <label className={styles.label}>HSN Code</label>
            <input
              className={styles.input}
              placeholder="Search HSN code (e.g. 0409 for honey)…"
              value={hsnSearch}
              onChange={(e) => { setHsnSearch(e.target.value); setHsnCode(e.target.value); }}
              onFocus={() => hsnResults.length > 0 && setHsnDropdown(true)}
              onBlur={() => setTimeout(() => setHsnDropdown(false), 200)}
            />
            {hsnDropdown && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100, background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: 6, boxShadow: "0 4px 20px rgba(0,0,0,0.15)", maxHeight: 180, overflowY: "auto" }}>
                {hsnResults.map(h => (
                  <div
                    key={h.id}
                    style={{ padding: "8px 12px", cursor: "pointer", borderBottom: "1px solid var(--border)", fontSize: 13 }}
                    onMouseDown={() => {
                      setHsnCode(h.code); setHsnSearch(`${h.code} — ${h.description}`);
                      if (h.taxRateId) setTaxRateId(h.taxRateId);
                      setHsnDropdown(false);
                    }}
                  >
                    <strong style={{ color: "var(--green)" }}>{h.code}</strong> — {h.description}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className={styles.field}>
            <label className={styles.label}>GST Tax Rate</label>
            <select
              className={styles.input}
              value={taxRateId}
              onChange={(e) => setTaxRateId(e.target.value === "" ? "" : Number(e.target.value))}
            >
              <option value="">— Exempt / Not applicable —</option>
              {taxRates.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
          {taxRateId !== "" && (() => {
            const r = taxRates.find(t => t.id === Number(taxRateId));
            if (!r) return null;
            return (
              <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "0 0 0.5rem" }}>
                Intra-state: CGST {(r.cgstRate / 100).toFixed(2)}% + SGST {(r.sgstRate / 100).toFixed(2)}% | Inter-state: IGST {(r.igstRate / 100).toFixed(2)}%
              </p>
            );
          })()}
        </div>

        <div className={styles.saveRow}>
          <Link href="/vendor/products" className={styles.cancelBtn}>Cancel</Link>
          <button type="submit" className={styles.saveBtn} disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Product"}
          </button>
        </div>
      </form>

      {/* Variants — only in edit mode */}
      {isEdit && (
        <div className={styles.card} style={{ marginTop: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 className={styles.cardTitle} style={{ margin: 0 }}>Variants (Price &amp; Stock)</h3>
            {!addingVariant && (
              <button type="button" className={styles.saveBtn} onClick={() => setAddingVariant(true)}>
                + Add Variant
              </button>
            )}
          </div>

          {variants.length === 0 && !addingVariant && (
            <p style={{ color: "#6b7280", fontSize: "14px" }}>No variants yet. Add at least one variant with price and stock for customers to order this product.</p>
          )}

          {/* Existing variants */}
          {variants.map((v) => (
            <div key={v.id} className={styles.variantRow}>
              {editingVariantId === v.id ? (
                <div className={styles.variantForm}>
                  <div className={styles.variantInputRow}>
                    <div className={styles.field}>
                      <label className={styles.label}>Name</label>
                      <input className={styles.input} value={editVariantForm.name} onChange={(e) => setEditVariantForm((f) => ({ ...f, name: e.target.value }))} />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>SKU</label>
                      <input className={styles.input} value={editVariantForm.sku} onChange={(e) => setEditVariantForm((f) => ({ ...f, sku: e.target.value }))} />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Price (₹)</label>
                      <input className={styles.input} type="number" min="0" step="0.01" value={editVariantForm.priceInr} onChange={(e) => setEditVariantForm((f) => ({ ...f, priceInr: e.target.value }))} />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>MRP (₹)</label>
                      <input className={styles.input} type="number" min="0" step="0.01" value={editVariantForm.mrpInr} onChange={(e) => setEditVariantForm((f) => ({ ...f, mrpInr: e.target.value }))} />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Stock</label>
                      <input className={styles.input} type="number" min="0" value={editVariantForm.stock} onChange={(e) => setEditVariantForm((f) => ({ ...f, stock: e.target.value }))} />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Weight</label>
                      <input className={styles.input} value={editVariantForm.weight} placeholder="500g" onChange={(e) => setEditVariantForm((f) => ({ ...f, weight: e.target.value }))} />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Variant Image URL</label>
                      <input className={styles.input} value={editVariantForm.imageUrl} placeholder="https://…" onChange={(e) => setEditVariantForm((f) => ({ ...f, imageUrl: e.target.value }))} />
                    </div>
                  </div>
                  {editVariantForm.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={editVariantForm.imageUrl} alt="" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 6, marginBottom: 8, border: "1px solid var(--border)" }} />
                  )}
                  <div className={styles.variantActions}>
                    <button type="button" className={styles.saveBtn} onClick={() => handleSaveVariantEdit(v.id)} disabled={savingVariant}>
                      {savingVariant ? "Saving…" : "Save"}
                    </button>
                    <button type="button" className={styles.cancelBtn} onClick={() => setEditingVariantId(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div className={styles.variantDisplay}>
                  <span className={styles.variantName}>{v.name}</span>
                  <span className={styles.variantDetail}>₹{(v.priceInr / 100).toLocaleString("en-IN")}{v.mrpInr ? ` / MRP ₹${(v.mrpInr / 100).toLocaleString("en-IN")}` : ""}</span>
                  <span className={styles.variantDetail}>{v.stock} in stock</span>
                  {v.weight && <span className={styles.variantDetail}>{v.weight}</span>}
                  <span className={styles.variantDetail} style={{ color: "#6b7280", fontSize: "12px" }}>{v.sku}</span>
                  <div className={styles.variantActions}>
                    <button type="button" className={styles.cancelBtn} onClick={() => startEditVariant(v)}>Edit</button>
                    <button type="button" className={styles.deleteBtn} onClick={() => handleDeleteVariant(v.id)}>Remove</button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Add variant form */}
          {addingVariant && (
            <div className={styles.variantForm}>
              <div className={styles.variantInputRow}>
                <div className={styles.field}>
                  <label className={styles.label}>Name *</label>
                  <input className={styles.input} placeholder="e.g. 500g" value={newVariant.name} onChange={(e) => setNewVariant((f) => ({ ...f, name: e.target.value }))} />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>SKU *</label>
                  <input className={styles.input} value={newVariant.sku} onChange={(e) => setNewVariant((f) => ({ ...f, sku: e.target.value }))} />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Price (₹) *</label>
                  <input className={styles.input} type="number" min="0" step="0.01" placeholder="299.00" value={newVariant.priceInr} onChange={(e) => setNewVariant((f) => ({ ...f, priceInr: e.target.value }))} />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>MRP (₹)</label>
                  <input className={styles.input} type="number" min="0" step="0.01" placeholder="399.00" value={newVariant.mrpInr} onChange={(e) => setNewVariant((f) => ({ ...f, mrpInr: e.target.value }))} />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Stock</label>
                  <input className={styles.input} type="number" min="0" value={newVariant.stock} onChange={(e) => setNewVariant((f) => ({ ...f, stock: e.target.value }))} />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Weight</label>
                  <input className={styles.input} placeholder="500g" value={newVariant.weight} onChange={(e) => setNewVariant((f) => ({ ...f, weight: e.target.value }))} />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Variant Image URL</label>
                  <input className={styles.input} value={newVariant.imageUrl} placeholder="https://…" onChange={(e) => setNewVariant((f) => ({ ...f, imageUrl: e.target.value }))} />
                </div>
              </div>
              <div className={styles.variantActions}>
                <button type="button" className={styles.saveBtn} onClick={handleAddVariant} disabled={savingVariant}>
                  {savingVariant ? "Adding…" : "Add Variant"}
                </button>
                <button type="button" className={styles.cancelBtn} onClick={() => { setAddingVariant(false); setNewVariant(EMPTY_VARIANT); }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
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
