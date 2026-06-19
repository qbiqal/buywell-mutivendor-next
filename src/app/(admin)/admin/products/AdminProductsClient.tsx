"use client";
import React, { useDeferredValue, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { DataTableFilters, type DataTableFilterField } from "@/components/admin/DataTableFilters";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import type { ProductWithVariants } from "@/types";
import styles from "./admin-products.module.css";

const STATUS_FILTERS = [
  { value: "", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const FEATURED_FILTERS = [
  { value: "", label: "Any featured state" },
  { value: "true", label: "Featured only" },
  { value: "false", label: "Not featured" },
];

export default function AdminProductsClient() {
  const router  = useRouter();
  const { success, error: showError } = useToast();
  const [products,  setProducts]  = useState<ProductWithVariants[]>([]);
  const [catNameMap, setCatNameMap] = useState<Map<string, string>>(new Map());
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [vendorList, setVendorList] = useState<Array<{ id: number; storeName: string | null }>>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const deferredSearch = useDeferredValue(search);
  const [status,    setStatus]    = useState("");
  const [featured,  setFeatured]  = useState("");
  const [vendor,    setVendor]    = useState("");
  const [category,  setCategory]  = useState("");
  const [dateFrom,  setDateFrom]  = useState("");
  const [dateTo,    setDateTo]    = useState("");
  const [minPrice,  setMinPrice]  = useState("");
  const [maxPrice,  setMaxPrice]  = useState("");
  const [minStock,  setMinStock]  = useState("");
  const [maxStock,  setMaxStock]  = useState("");
  const [page,      setPage]      = useState(1);
  const [total,     setTotal]     = useState(0);
  const LIMIT = 20;
  const [confirmState, setConfirmState] = useState<{open: boolean; title: string; message: string; onConfirm: () => void}>({open: false, title: "", message: "", onConfirm: () => {}});
  const [loadError, setLoadError] = useState<string | null>(null);

  // Bulk Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAllMatching, setSelectAllMatching] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  function openConfirm(title: string, message: string): Promise<boolean> {
    return new Promise((resolve) => {
      setConfirmState({ open: true, title, message, onConfirm: () => { setConfirmState(s => ({...s, open: false})); resolve(true); } });
    });
  }

  // Load categories and vendors once for filters and badge display
  useEffect(() => {
    fetch("/api/products/categories")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          const cats = d.data as Array<{ id: string; name: string }>;
          setCatNameMap(new Map(cats.map((c) => [c.id, c.name])));
          setCategories(cats);
        }
      })
      .catch(() => {});
    fetch("/api/admin/vendors?limit=100")
      .then((r) => r.json())
      .then((d) => { if (d.success) setVendorList(d.vendors ?? []); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const q = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    if (deferredSearch) q.set("search", deferredSearch);
    if (status) q.set("status", status);
    if (featured) q.set("featured", featured);
    if (vendor) q.set("vendor", vendor);
    if (category) q.set("categoryId", category);
    if (dateFrom) q.set("dateFrom", dateFrom);
    if (dateTo) q.set("dateTo", dateTo);
    if (minPrice) q.set("minPrice", minPrice);
    if (maxPrice) q.set("maxPrice", maxPrice);
    if (minStock) q.set("minStock", minStock);
    if (maxStock) q.set("maxStock", maxStock);
    fetch(`/api/admin/products?${q}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setProducts(d.data);
          setTotal(d.pagination.total);
          setLoadError(null);
        } else {
          setLoadError(d.error ?? "Failed to load products. The database may need a migration — check container logs.");
        }
      })
      .catch(() => setLoadError("Network error. Could not reach the products API."))
      .finally(() => setLoading(false));

    // Reset selection when filters change (except page)
    setSelectedIds(new Set());
    setSelectAllMatching(false);
  }, [deferredSearch, status, featured, vendor, category, dateFrom, dateTo, minPrice, maxPrice, minStock, maxStock, page]);

  async function toggleActive(id: string, isActive: boolean) {
    const res  = await fetch(`/api/admin/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    });
    const data = await res.json();
    if (data.success) {
      setProducts((p) => p.map((x) => x.id === id ? { ...x, isActive } : x));
      success(isActive ? "Product activated" : "Product deactivated");
    } else {
      showError("Update failed");
    }
  }

  async function deleteProduct(id: string, name: string) {
    if (!(await openConfirm("Delete Product", `Delete "${name}"? This cannot be undone.`))) return;
    const res  = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      if (data.data?.archived) {
        success("Product has orders, so it was archived (set to inactive) instead.");
        setProducts((p) => p.map((x) => x.id === id ? { ...x, isActive: false } : x));
      } else {
        success("Product deleted"); 
        setProducts((p) => p.filter((x) => x.id !== id)); 
      }
    } else {
      showError("Delete failed");
    }
  }

  async function handleBulkDelete() {
    const totalCount = selectAllMatching ? total : selectedIds.size;
    if (!(await openConfirm("Bulk Delete", `Are you sure you want to delete ${totalCount} product(s)? This action cannot be undone.`))) return;
    
    setIsBulkDeleting(true);
    try {
      const res = await fetch("/api/admin/products/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          selectedIds: Array.from(selectedIds),
          selectAll: selectAllMatching,
          filters: { search: deferredSearch, status, featured, vendor, categoryId: category, dateFrom, dateTo, minPrice, maxPrice, minStock, maxStock }
        }),
      });
      const data = await res.json();
      if (data.success) {
        success(`Successfully deleted ${data.count} product(s). ${data.archived > 0 ? `(${data.archived} archived instead due to orders)` : ""}`);
        setSelectedIds(new Set());
        setSelectAllMatching(false);
        // Refresh products
        setPage(1);
        setProducts((p) => [...p]); // Trigger refresh or you can reload the page
        router.refresh();
        setTimeout(() => window.location.reload(), 500);
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
    setSelectAllMatching(checked);
    if (checked) {
      setSelectedIds(new Set(products.map(p => p.id)));
    } else {
      setSelectedIds(new Set());
    }
  }

  function toggleSelect(id: string, checked: boolean) {
    setSelectAllMatching(false); // If manually changing one, disable the "select all matching" flag
    const newSelected = new Set(selectedIds);
    if (checked) newSelected.add(id);
    else newSelected.delete(id);
    setSelectedIds(newSelected);
  }

  const pages = Math.ceil(total / LIMIT);
  const categoryFilterOptions = [
    { value: "", label: "All categories" },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
  ];
  const vendorFilterOptions = [
    { value: "", label: "All vendors" },
    { value: "admin", label: "Admin (no vendor)" },
    ...vendorList.map((v) => ({ value: String(v.id), label: v.storeName ?? `Vendor #${v.id}` })),
  ];
  const filterFields: DataTableFilterField[] = [
    { key: "status", label: "Status", type: "select", value: status, options: STATUS_FILTERS, onChange: (value) => { setStatus(value); setPage(1); } },
    { key: "featured", label: "Featured", type: "select", value: featured, options: FEATURED_FILTERS, onChange: (value) => { setFeatured(value); setPage(1); } },
    { key: "categoryId", label: "Category", type: "select", value: category, options: categoryFilterOptions, onChange: (value) => { setCategory(value); setPage(1); } },
    { key: "vendor", label: "Vendor", type: "select", value: vendor, options: vendorFilterOptions, onChange: (value) => { setVendor(value); setPage(1); } },
    { key: "dateFrom", label: "Created From", type: "date", value: dateFrom, onChange: (value) => { setDateFrom(value); setPage(1); } },
    { key: "dateTo", label: "Created To", type: "date", value: dateTo, onChange: (value) => { setDateTo(value); setPage(1); } },
    { key: "minPrice", label: "Min Price (₹)", type: "number", min: 0, step: 1, value: minPrice, placeholder: "0", onChange: (value) => { setMinPrice(value); setPage(1); } },
    { key: "maxPrice", label: "Max Price (₹)", type: "number", min: 0, step: 1, value: maxPrice, placeholder: "2000", onChange: (value) => { setMaxPrice(value); setPage(1); } },
    { key: "minStock", label: "Min Stock", type: "number", min: 0, step: 1, value: minStock, placeholder: "0", onChange: (value) => { setMinStock(value); setPage(1); } },
    { key: "maxStock", label: "Max Stock", type: "number", min: 0, step: 1, value: maxStock, placeholder: "100", onChange: (value) => { setMaxStock(value); setPage(1); } },
  ];

  function resetFilters() {
    setSearch("");
    setStatus("");
    setFeatured("");
    setVendor("");
    setCategory("");
    setDateFrom("");
    setDateTo("");
    setMinPrice("");
    setMaxPrice("");
    setMinStock("");
    setMaxStock("");
    setPage(1);
  }

  return (
    <div className={styles.content}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className="admin-page-title">Products</h1>
          <p className="admin-page-subtitle">{total} product{total !== 1 ? "s" : ""} total</p>
        </div>
        <Button variant="primary" onClick={() => router.push("/admin/products/new")}>
          + Add Product
        </Button>
      </div>

      <DataTableFilters
        title="Product filters"
        subtitle="Search, status, date, stock, and price filters reuse the admin table filter panel."
        searchValue={search}
        searchPlaceholder="Search name or SKU..."
        onSearchChange={(value) => { setSearch(value); setPage(1); }}
        fields={filterFields}
        onReset={resetFilters}
        resultLabel={`${total} result${total !== 1 ? "s" : ""}`}
        exportFileName="buywell-products"
        exportRows={products.map((product) => ({
          name: product.name,
          slug: product.slug,
          category: catNameMap.get(product.categoryId ?? "") ?? product.category,
          sku: product.sku,
          active: product.isActive ? "Yes" : "No",
          featured: product.isFeatured ? "Yes" : "No",
          variants: product.variants.length,
          stock: product.variants.reduce((sum, variant) => sum + variant.stock, 0),
        }))}
      />

      {/* Bulk Actions Banner */}
      {(selectedIds.size > 0 || selectAllMatching) && (
        <div className={styles.bulkBanner} style={{ padding: '12px', background: '#e0e7ff', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <strong>{selectAllMatching ? total : selectedIds.size}</strong> product(s) selected.
          </div>
          <Button variant="danger" onClick={handleBulkDelete} disabled={isBulkDeleting}>
            {isBulkDeleting ? <Spinner size="sm" /> : "Delete Selected"}
          </Button>
        </div>
      )}

      {/* Table */}
      {loadError && (
        <div className={styles.apiError}>
          <strong>Error loading products:</strong> {loadError}
        </div>
      )}
      {loading ? (
        <div className={styles.loadingWrap}><Spinner size="lg" /></div>
      ) : !loadError && products.length === 0 ? (
        <div className={styles.empty}>
          <p>No products found.</p>
          <Button variant="secondary" onClick={() => router.push("/admin/products/new")}>Add Your First Product</Button>
        </div>
      ) : loadError ? null : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input
                    type="checkbox"
                    checked={selectAllMatching || (products.length > 0 && selectedIds.size === products.length)}
                    onChange={(e) => toggleSelectAll(e.target.checked)}
                    style={{ cursor: "pointer", width: "16px", height: "16px" }}
                    title="Select all matching products"
                  />
                </th>
                <th>Product</th>
                <th>Category</th>
                <th>Uploaded By</th>
                <th>Variants</th>
                <th>SKU</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const primaryImg = p.images.find((i) => i.isPrimary)?.url ?? p.images[0]?.url;
                const lowestPrice = p.variants.length > 0
                  ? Math.min(...p.variants.map((v) => v.priceInr))
                  : 0;
                const totalStock = p.variants.reduce((sum, v) => sum + v.stock, 0);
                return (
                  <tr key={p.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(p.id) || selectAllMatching}
                        onChange={(e) => toggleSelect(p.id, e.target.checked)}
                        style={{ cursor: "pointer", width: "16px", height: "16px" }}
                      />
                    </td>
                    <td>
                      <div className={styles.productCell}>
                        <div className={styles.productImg}>
                          {primaryImg ? (
                            <Image src={primaryImg} alt={p.name} fill className={styles.img} sizes="48px" />
                          ) : (
                            <span className={styles.imgPlaceholder}>🍯</span>
                          )}
                        </div>
                        <div className={styles.productMeta}>
                          <Link href={`/admin/products/${p.id}/edit`} className={styles.productName}>{p.name}</Link>
                          {lowestPrice > 0 && (
                            <p className={styles.productPrice}>from ₹{(lowestPrice / 100).toLocaleString("en-IN")}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <Badge variant="success">
                        {catNameMap.get(p.categoryId ?? "") ?? p.category}
                      </Badge>
                      {p.isFeatured && <Badge variant="info" className={styles.featuredBadge}>Featured</Badge>}
                    </td>
                    <td>
                      {p.vendorId ? (
                        <Link href={`/admin/vendors/${p.vendorId}`} className={styles.vendorLink}>
                          <Badge variant="info">{p.vendorName ?? `Vendor #${p.vendorId}`}</Badge>
                        </Link>
                      ) : (
                        <Badge variant="success">Admin</Badge>
                      )}
                    </td>
                    <td>
                      <span className={styles.variantCount}>{p.variants.length} variant{p.variants.length !== 1 ? "s" : ""}</span>
                      <span className={totalStock === 0 ? styles.stockOut : styles.stockIn}>
                        {totalStock} in stock
                      </span>
                    </td>
                    <td><code className={styles.sku}>{p.sku}</code></td>
                    <td>
                      <button
                        onClick={() => toggleActive(p.id, !p.isActive)}
                        className={[styles.toggleBtn, p.isActive ? styles.toggleActive : styles.toggleInactive].join(" ")}
                      >
                        {p.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <Link href={`/shop/${p.slug}`} target="_blank" className={styles.actionBtn} title="Preview">👁</Link>
                        <Link href={`/admin/products/${p.id}/edit`} className={styles.actionBtn} title="Edit">✏️</Link>
                        <button onClick={() => deleteProduct(p.id, p.name)} className={[styles.actionBtn, styles.deleteBtn].join(" ")} title="Delete">🗑</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className={styles.pagination}>
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className={styles.pageBtn}>← Prev</button>
          <span className={styles.pageInfo}>Page {page} of {pages}</span>
          <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages} className={styles.pageBtn}>Next →</button>
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
