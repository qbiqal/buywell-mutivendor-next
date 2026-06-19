"use client";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import styles from "./admin-categories.module.css";

interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  color: string | null;
  description: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  hsnCode: string | null;
  taxRateId: number | null;
  showOnHomepage: boolean;
  showOnShop: boolean;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

interface TaxRate { id: number; name: string; rate: string; }

const EMPTY_FORM = {
  name: "",
  slug: "",
  parentId: "",
  color: "#2D7D46",
  description: "",
  seoTitle: "",
  seoDescription: "",
  hsnCode: "",
  taxRateId: "",
  showOnHomepage: false,
  showOnShop: true,
  sortOrder: "0",
  isActive: true,
};

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 120);
}

export default function AdminCategoriesClient() {
  const { success, error: showError } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [confirmState, setConfirmState] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void }>({
    open: false, title: "", message: "", onConfirm: () => {},
  });
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);

  // Bulk Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  async function loadCategories() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/products/categories");
      const data = await res.json();
      if (data.success) setCategories(data.data);
      else showError("Failed to load categories");
    } catch {
      showError("Network error loading categories");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCategories();
    fetch("/api/admin/tax/rates").then(r => r.json()).then(d => { if (d.success) setTaxRates(d.taxRates ?? []); }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function openCreate() {
    setEditId(null);
    setForm({ ...EMPTY_FORM });
    setShowForm(true);
  }

  function openEdit(cat: Category) {
    setEditId(cat.id);
    setForm({
      name: cat.name,
      slug: cat.slug,
      parentId: cat.parentId ?? "",
      color: cat.color ?? "#2D7D46",
      description: cat.description ?? "",
      seoTitle: cat.seoTitle ?? "",
      seoDescription: cat.seoDescription ?? "",
      hsnCode: cat.hsnCode ?? "",
      taxRateId: cat.taxRateId ? String(cat.taxRateId) : "",
      showOnHomepage: cat.showOnHomepage,
      showOnShop: cat.showOnShop,
      sortOrder: String(cat.sortOrder),
      isActive: cat.isActive,
    });
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditId(null);
    setForm({ ...EMPTY_FORM });
  }

  function handleNameChange(name: string) {
    setForm((f) => ({ ...f, name, slug: editId ? f.slug : toSlug(name) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { showError("Category name is required"); return; }
    setSaving(true);
    try {
      const payload = {
        ...(editId ? { id: editId } : {}),
        name: form.name.trim(),
        slug: form.slug.trim() || toSlug(form.name),
        parentId: form.parentId || null,
        color: form.color,
        description: form.description.trim() || null,
        seoTitle: form.seoTitle.trim() || null,
        seoDescription: form.seoDescription.trim() || null,
        hsnCode: form.hsnCode.trim() || null,
        taxRateId: form.taxRateId ? parseInt(form.taxRateId, 10) : null,
        showOnHomepage: form.showOnHomepage,
        showOnShop: form.showOnShop,
        sortOrder: parseInt(form.sortOrder, 10) || 0,
        isActive: form.isActive,
      };
      const res = await fetch("/api/admin/products/categories", {
        method: editId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        success(editId ? "Category updated" : "Category created");
        cancelForm();
        await loadCategories();
      } else {
        showError(data.error ?? "Save failed");
      }
    } catch {
      showError("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(cat: Category) {
    try {
      const res = await fetch("/api/admin/products/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: cat.id, isActive: !cat.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        setCategories((prev) => prev.map((c) => c.id === cat.id ? { ...c, isActive: !cat.isActive } : c));
        success(!cat.isActive ? "Category activated" : "Category deactivated");
      } else showError("Update failed");
    } catch { showError("Network error"); }
  }

  async function patchVisibility(cat: Category, field: 'showOnHomepage' | 'showOnShop', value: boolean) {
    try {
      const res = await fetch('/api/admin/products/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: cat.id, [field]: value }),
      });
      const data = await res.json();
      if (data.success) {
        setCategories((prev) => prev.map((c) => c.id === cat.id ? { ...c, [field]: value } : c));
      } else showError('Update failed');
    } catch { showError('Network error'); }
  }

  function openDelete(cat: Category) {
    setConfirmState({
      open: true,
      title: "Delete Category",
      message: `Delete category "${cat.name}"? Products using this category will need to be re-categorised. This cannot be undone.`,
      onConfirm: async () => {
        setConfirmState((s) => ({ ...s, open: false }));
        try {
          const res = await fetch(`/api/admin/products/categories?id=${cat.id}`, { method: "DELETE" });
          const data = await res.json();
          if (data.success) { success("Category deleted"); await loadCategories(); }
          else showError(data.error ?? "Delete failed");
        } catch { showError("Network error"); }
      },
    });
  }

  async function handleBulkDelete() {
    const totalCount = selectAll ? categories.length : selectedIds.size;
    if (!(await openConfirm("Bulk Delete", `Are you sure you want to delete ${totalCount} category(s)? This action cannot be undone.`))) return;
    
    setIsBulkDeleting(true);
    try {
      const res = await fetch("/api/admin/products/categories/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          selectedIds: selectAll ? categories.map(c => c.id) : Array.from(selectedIds),
        }),
      });
      const data = await res.json();
      if (data.success) {
        success(`Successfully deleted ${data.count} category(s).`);
        setSelectedIds(new Set());
        setSelectAll(false);
        await loadCategories();
      } else {
        showError(data.error || "Bulk delete failed");
      }
    } catch (err) {
      showError("Network error during bulk delete");
    } finally {
      setIsBulkDeleting(false);
    }
  }

  function toggleSelectAll(checked: boolean) {
    setSelectAll(checked);
    if (checked) {
      setSelectedIds(new Set(categories.map(c => c.id)));
    } else {
      setSelectedIds(new Set());
    }
  }

  function toggleSelect(id: string, checked: boolean) {
    setSelectAll(false);
    const newSelected = new Set(selectedIds);
    if (checked) newSelected.add(id);
    else newSelected.delete(id);
    setSelectedIds(newSelected);
  }

  const parentMap = new Map(categories.map((c) => [c.id, c.name]));
  const topLevel = categories.filter((c) => !c.parentId);

  return (
    <div className={styles.content}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className="admin-page-title">Product Categories</h1>
          <p className="admin-page-subtitle">{categories.length} categor{categories.length !== 1 ? "ies" : "y"} total</p>
        </div>
        <Button variant="primary" onClick={openCreate}>+ Add Category</Button>
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <div className={styles.formCard}>
          <h2 className={styles.formTitle}>{editId ? "Edit Category" : "New Category"}</h2>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Name *</label>
                <input
                  className={styles.input}
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Honey"
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Slug</label>
                <input
                  className={styles.input}
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  placeholder="auto-generated from name"
                />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Parent Category</label>
                <select
                  className={styles.select}
                  value={form.parentId}
                  onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value }))}
                >
                  <option value="">— None (top-level) —</option>
                  {topLevel.filter((c) => c.id !== editId).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Color</label>
                <div className={styles.colorRow}>
                  <input
                    type="color"
                    className={styles.colorInput}
                    value={form.color}
                    onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                  />
                  <input
                    className={styles.input}
                    value={form.color}
                    onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                    placeholder="#2D7D46"
                    style={{ maxWidth: 120 }}
                  />
                </div>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Sort Order</label>
                <input
                  type="number"
                  className={styles.input}
                  value={form.sortOrder}
                  onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                  min={0}
                  style={{ maxWidth: 100 }}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Description</label>
              <textarea
                className={styles.textarea}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
                placeholder="Optional short description"
              />
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>SEO Title</label>
                <input
                  className={styles.input}
                  value={form.seoTitle}
                  onChange={(e) => setForm((f) => ({ ...f, seoTitle: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>SEO Description</label>
                <input
                  className={styles.input}
                  value={form.seoDescription}
                  onChange={(e) => setForm((f) => ({ ...f, seoDescription: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
            </div>

            {/* GST / HSN defaults — auto-populate the product form when this category is selected */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Default HSN Code</label>
                <input
                  className={styles.input}
                  value={form.hsnCode}
                  onChange={(e) => setForm((f) => ({ ...f, hsnCode: e.target.value }))}
                  placeholder="e.g. 0409 (Honey), 8517 (Phones)"
                  maxLength={8}
                />
                <span className={styles.hint}>Auto-fills HSN on products in this category</span>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Default GST Tax Rate</label>
                <select
                  className={styles.select}
                  value={form.taxRateId}
                  onChange={(e) => setForm((f) => ({ ...f, taxRateId: e.target.value }))}
                >
                  <option value="">— Select rate —</option>
                  {taxRates.map((r) => (
                    <option key={r.id} value={r.id}>{r.name} ({r.rate}%)</option>
                  ))}
                </select>
                <span className={styles.hint}>Auto-fills GST rate on products in this category</span>
              </div>
            </div>

            <div className={styles.formRow} style={{ gap: 24 }}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                />
                Active
              </label>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={form.showOnHomepage}
                  onChange={(e) => setForm((f) => ({ ...f, showOnHomepage: e.target.checked }))}
                />
                Show on Homepage
              </label>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={form.showOnShop}
                  onChange={(e) => setForm((f) => ({ ...f, showOnShop: e.target.checked }))}
                />
                Show on Shop Page
              </label>
            </div>

            <div className={styles.formActions}>
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? "Saving…" : editId ? "Update Category" : "Create Category"}
              </Button>
              <Button type="button" variant="secondary" onClick={cancelForm} disabled={saving}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className={styles.loadingWrap}><Spinner size="lg" /></div>
      ) : categories.length === 0 ? (
        <div className={styles.empty}>
          <p>No categories yet.</p>
          <Button variant="secondary" onClick={openCreate}>Create First Category</Button>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          {(selectedIds.size > 0 || selectAll) && (
            <div className={styles.bulkBanner} style={{ padding: '12px', background: '#e0e7ff', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <strong>{selectAll ? categories.length : selectedIds.size}</strong> category(s) selected.
              </div>
              <Button variant="danger" onClick={handleBulkDelete} disabled={isBulkDeleting}>
                {isBulkDeleting ? <Spinner size="sm" /> : "Delete Selected"}
              </Button>
            </div>
          )}
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input
                    type="checkbox"
                    checked={selectAll || (categories.length > 0 && selectedIds.size === categories.length)}
                    onChange={(e) => toggleSelectAll(e.target.checked)}
                    style={{ cursor: "pointer", width: "16px", height: "16px" }}
                  />
                </th>
                <th>Color</th>
                <th>Name</th>
                <th>Slug</th>
                <th>Parent</th>
                <th>HSN / GST</th>
                <th>Sort</th>
                <th>Visibility</th>
                <th>Active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(cat.id) || selectAll}
                      onChange={(e) => toggleSelect(cat.id, e.target.checked)}
                      style={{ cursor: "pointer", width: "16px", height: "16px" }}
                    />
                  </td>
                  <td>
                    <span
                      className={styles.colorSwatch}
                      style={{ background: cat.color ?? "#2D7D46" }}
                      title={cat.color ?? "#2D7D46"}
                    />
                  </td>
                  <td>
                    <span className={styles.catName}>{cat.name}</span>
                    {cat.description && <span className={styles.catDesc}>{cat.description}</span>}
                  </td>
                  <td><code className={styles.slug}>{cat.slug}</code></td>
                  <td>
                    {cat.parentId ? (
                      <Badge variant="info">{parentMap.get(cat.parentId) ?? cat.parentId}</Badge>
                    ) : (
                      <span className={styles.topLevel}>Top level</span>
                    )}
                  </td>
                  <td>
                    {cat.hsnCode ? (
                      <div>
                        <code className={styles.hsnBadge}>{cat.hsnCode}</code>
                        {cat.taxRateId && taxRates.find(r => r.id === cat.taxRateId) && (
                          <span className={styles.gstBadge}>{taxRates.find(r => r.id === cat.taxRateId)!.rate}% GST</span>
                        )}
                      </div>
                    ) : (
                      <span className={styles.noHsn}>—</span>
                    )}
                  </td>
                  <td><span className={styles.sortOrder}>{cat.sortOrder}</span></td>
                  <td>
                    <div className={styles.visibilityBadges}>
                      <button
                        title="Toggle homepage visibility"
                        onClick={() => patchVisibility(cat, 'showOnHomepage', !cat.showOnHomepage)}
                        className={[styles.visBadge, cat.showOnHomepage ? styles.visOn : styles.visOff].join(" ")}
                      >
                        🏠 {cat.showOnHomepage ? "Home" : "Home"}
                      </button>
                      <button
                        title="Toggle shop page visibility"
                        onClick={() => patchVisibility(cat, 'showOnShop', !cat.showOnShop)}
                        className={[styles.visBadge, cat.showOnShop ? styles.visOn : styles.visOff].join(" ")}
                      >
                        🛍 {cat.showOnShop ? "Shop" : "Shop"}
                      </button>
                    </div>
                  </td>
                  <td>
                    <button
                      onClick={() => toggleActive(cat)}
                      className={[styles.toggleBtn, cat.isActive ? styles.toggleActive : styles.toggleInactive].join(" ")}
                    >
                      {cat.isActive ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button onClick={() => openEdit(cat)} className={styles.actionBtn} title="Edit">✏️</button>
                      <button onClick={() => openDelete(cat)} className={[styles.actionBtn, styles.deleteBtn].join(" ")} title="Delete">🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState((s) => ({ ...s, open: false }))}
        variant="danger"
      />
    </div>
  );
}
