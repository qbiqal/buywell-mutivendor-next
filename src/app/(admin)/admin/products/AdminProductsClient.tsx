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
import type { ProductWithVariants } from "@/types";
import styles from "./admin-products.module.css";

const CATEGORY_FILTERS = [
  { value: "",      label: "All categories" },
  { value: "honey", label: "Honey" },
  { value: "ghee",  label: "Ghee" },
  { value: "other", label: "Other" },
];

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
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const deferredSearch = useDeferredValue(search);
  const [category,  setCategory]  = useState("");
  const [status,    setStatus]    = useState("");
  const [featured,  setFeatured]  = useState("");
  const [dateFrom,  setDateFrom]  = useState("");
  const [dateTo,    setDateTo]    = useState("");
  const [minPrice,  setMinPrice]  = useState("");
  const [maxPrice,  setMaxPrice]  = useState("");
  const [minStock,  setMinStock]  = useState("");
  const [maxStock,  setMaxStock]  = useState("");
  const [page,      setPage]      = useState(1);
  const [total,     setTotal]     = useState(0);
  const LIMIT = 20;

  useEffect(() => {
    setLoading(true);
    const q = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    if (deferredSearch) q.set("search", deferredSearch);
    if (category) q.set("category", category);
    if (status) q.set("status", status);
    if (featured) q.set("featured", featured);
    if (dateFrom) q.set("dateFrom", dateFrom);
    if (dateTo) q.set("dateTo", dateTo);
    if (minPrice) q.set("minPrice", minPrice);
    if (maxPrice) q.set("maxPrice", maxPrice);
    if (minStock) q.set("minStock", minStock);
    if (maxStock) q.set("maxStock", maxStock);
    fetch(`/api/admin/products?${q}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) { setProducts(d.data); setTotal(d.pagination.total); } })
      .finally(() => setLoading(false));
  }, [deferredSearch, category, status, featured, dateFrom, dateTo, minPrice, maxPrice, minStock, maxStock, page]);

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
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    const res  = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) { success("Product deleted"); setProducts((p) => p.filter((x) => x.id !== id)); }
    else showError("Delete failed");
  }

  const pages = Math.ceil(total / LIMIT);
  const filterFields: DataTableFilterField[] = [
    { key: "category", label: "Category", type: "select", value: category, options: CATEGORY_FILTERS, onChange: (value) => { setCategory(value); setPage(1); } },
    { key: "status", label: "Status", type: "select", value: status, options: STATUS_FILTERS, onChange: (value) => { setStatus(value); setPage(1); } },
    { key: "featured", label: "Featured", type: "select", value: featured, options: FEATURED_FILTERS, onChange: (value) => { setFeatured(value); setPage(1); } },
    { key: "dateFrom", label: "Created From", type: "date", value: dateFrom, onChange: (value) => { setDateFrom(value); setPage(1); } },
    { key: "dateTo", label: "Created To", type: "date", value: dateTo, onChange: (value) => { setDateTo(value); setPage(1); } },
    { key: "minPrice", label: "Min Price (₹)", type: "number", min: 0, step: 1, value: minPrice, placeholder: "0", onChange: (value) => { setMinPrice(value); setPage(1); } },
    { key: "maxPrice", label: "Max Price (₹)", type: "number", min: 0, step: 1, value: maxPrice, placeholder: "2000", onChange: (value) => { setMaxPrice(value); setPage(1); } },
    { key: "minStock", label: "Min Stock", type: "number", min: 0, step: 1, value: minStock, placeholder: "0", onChange: (value) => { setMinStock(value); setPage(1); } },
    { key: "maxStock", label: "Max Stock", type: "number", min: 0, step: 1, value: maxStock, placeholder: "100", onChange: (value) => { setMaxStock(value); setPage(1); } },
  ];

  function resetFilters() {
    setSearch("");
    setCategory("");
    setStatus("");
    setFeatured("");
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
        exportFileName="apras-products"
        exportRows={products.map((product) => ({
          name: product.name,
          slug: product.slug,
          category: product.subCategory ?? product.category,
          sku: product.sku,
          active: product.isActive ? "Yes" : "No",
          featured: product.isFeatured ? "Yes" : "No",
          variants: product.variants.length,
          stock: product.variants.reduce((sum, variant) => sum + variant.stock, 0),
        }))}
      />

      {/* Table */}
      {loading ? (
        <div className={styles.loadingWrap}><Spinner size="lg" /></div>
      ) : products.length === 0 ? (
        <div className={styles.empty}>
          <p>No products found.</p>
          <Button variant="secondary" onClick={() => router.push("/admin/products/new")}>Add Your First Product</Button>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
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
                      <Badge variant={p.category === "honey" ? "warning" : "success"}>
                        {p.subCategory ?? p.category}
                      </Badge>
                      {p.isFeatured && <Badge variant="info" className={styles.featuredBadge}>Featured</Badge>}
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
    </div>
  );
}
