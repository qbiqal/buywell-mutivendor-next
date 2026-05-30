"use client";
import React, { useState, useEffect } from "react";
import { ProductCard } from "@/components/shop/ProductCard";
import { Spinner } from "@/components/ui/Spinner";
import type { ProductWithVariants } from "@/types";
import styles from "./shop.module.css";

const CATEGORIES = [
  { value: "",      label: "All Products" },
  { value: "honey", label: "🍯 Honey" },
  { value: "ghee",  label: "🥛 A2 Ghee" },
];

export default function ShopClient() {
  const [products,  setProducts]  = useState<ProductWithVariants[]>([]);
  const [category,  setCategory]  = useState("");
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    setLoading(true);
    const url = `/api/products${category ? `?category=${category}` : ""}`;
    fetch(url)
      .then((r) => r.json())
      .then((d) => { if (d.success) setProducts(d.data); })
      .finally(() => setLoading(false));
  }, [category]);

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.container}>
          <p className="eyebrow">Prakvedaa Collection</p>
          <h1 className="section-title serif">Pure Natural Products</h1>
          <p className="section-lead">Raw, single-source honeys and authentic A2 Bilona Ghee. No shortcuts.</p>
        </div>
      </div>

      <div className={styles.container}>
        {/* Filter tabs */}
        <div className={styles.filterRow}>
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setCategory(c.value)}
              className={[styles.filterBtn, category === c.value ? styles.filterActive : ""].join(" ")}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Product grid */}
        {loading ? (
          <div className={styles.loadingWrap}><Spinner size="lg" /></div>
        ) : products.length === 0 ? (
          <div className={styles.empty}>
            <p>No products found.</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
