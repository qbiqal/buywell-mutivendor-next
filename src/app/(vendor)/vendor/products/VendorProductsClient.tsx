"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import styles from "./vendor-products.module.css";

interface ProductRow {
  id: string;
  name: string;
  slug: string;
  category: string;
  isActive: boolean;
  isFeatured: boolean;
  sku: string;
  createdAt: string;
  imageUrl: string | null;
}

export default function VendorProductsClient() {
  const toast = useToast();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [toggling, setToggling] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/vendor/products?${params}`);
      const data = await res.json();
      if (data.success) setProducts(data.products);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  async function toggleActive(id: string, current: boolean) {
    setToggling(id);
    try {
      const res = await fetch(`/api/vendor/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !current }),
      });
      if (res.ok) { toast.success(current ? "Product deactivated." : "Product activated."); load(); }
      else { const d = await res.json(); toast.error(d.error || "Update failed."); }
    } catch { toast.error("Network error."); }
    finally { setToggling(null); }
  }

  async function deleteProduct(id: string, name: string) {
    if (!confirm(`Deactivate "${name}"? This will hide it from the store.`)) return;
    setToggling(id);
    try {
      const res = await fetch(`/api/vendor/products/${id}`, { method: "DELETE" });
      if (res.ok) { toast.success("Product deactivated."); load(); }
      else { const d = await res.json(); toast.error(d.error || "Delete failed."); }
    } catch { toast.error("Network error."); }
    finally { setToggling(null); }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Products</h1>
        <Link href="/vendor/products/new" className={styles.addBtn}>+ Add Product</Link>
      </div>

      <div className={styles.filters}>
        <input className={styles.search} placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className={styles.select} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {loading ? (
        <div className={styles.empty}>Loading…</div>
      ) : products.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No products yet.</p>
          <Link href="/vendor/products/new" className={styles.addBtn}>Add your first product</Link>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Category</th>
              <th>Status</th>
              <th>Added</th>
              <th>Actions</th>
            </tr></thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className={styles.productCell}>
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt="" className={styles.thumb} />
                      ) : (
                        <div className={styles.thumbPlaceholder}>📷</div>
                      )}
                      <div>
                        <Link href={`/vendor/products/${p.id}`} className={styles.productName}>{p.name}</Link>
                        <div className={styles.productSlug}>/{p.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td className={styles.sku}>{p.sku}</td>
                  <td>{p.category}</td>
                  <td>
                    <span className={p.isActive ? styles.active : styles.inactive}>
                      {p.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>{new Date(p.createdAt).toLocaleDateString("en-IN")}</td>
                  <td>
                    <div className={styles.actions}>
                      <Link href={`/vendor/products/${p.id}`} className={styles.editBtn}>Edit</Link>
                      <button
                        className={p.isActive ? styles.deactivateBtn : styles.activateBtn}
                        onClick={() => toggleActive(p.id, p.isActive)}
                        disabled={toggling === p.id}
                      >{p.isActive ? "Deactivate" : "Activate"}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
