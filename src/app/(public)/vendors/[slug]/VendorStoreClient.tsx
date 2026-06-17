"use client";

import Link from "next/link";
import styles from "./vendor-store.module.css";

interface Product {
  id: string;
  name: string;
  slug: string;
  category: string;
  subCategory: string | null;
  description: string | null;
  imageUrl: string | null | undefined;
}

interface Vendor {
  id: number;
  storeName: string;
  storeDescription: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  city: string | null;
  state: string | null;
  rating: string;
  createdAt: string;
}

export default function VendorStoreClient({ vendor, products }: { vendor: Vendor; products: Product[] }) {
  const location = [vendor.city, vendor.state].filter(Boolean).join(", ");

  return (
    <div className={styles.page}>
      {/* Banner */}
      <div 
        className={styles.banner} 
        style={vendor.bannerUrl ? { backgroundImage: `url(${vendor.bannerUrl})` } : undefined}
      >
        {!vendor.bannerUrl && <div className={styles.bannerPlaceholder}>🏪</div>}
      </div>

      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.logoWrapper}>
            {vendor.logoUrl ? (
              <img src={vendor.logoUrl} alt={vendor.storeName} className={styles.logo} />
            ) : (
              <span className={styles.logoFallback}>{vendor.storeName.charAt(0)}</span>
            )}
          </div>
          <div className={styles.info}>
            <h1 className={styles.storeName}>{vendor.storeName}</h1>
            <div className={styles.stats}>
              {location && (
                <div className={styles.statItem}>
                  <span>📍</span> {location}
                </div>
              )}
              <div className={styles.statItem}>
                <span>⭐</span> {vendor.rating} / 5.0
              </div>
              <div className={styles.statItem}>
                <span>📅</span> Joined {new Date(vendor.createdAt).getFullYear()}
              </div>
            </div>
          </div>
        </div>

        {/* About */}
        {vendor.storeDescription && (
          <div className={styles.aboutSection}>
            <h2 className={styles.sectionTitle}>About {vendor.storeName}</h2>
            <p className={styles.description}>{vendor.storeDescription}</p>
          </div>
        )}

        {/* Products */}
        <div>
          <h2 className={styles.sectionTitle}>Products from {vendor.storeName}</h2>
          {products.length === 0 ? (
            <div className={styles.empty}>This vendor has not listed any products yet.</div>
          ) : (
            <div className={styles.productGrid}>
              {products.map(p => (
                <Link key={p.id} href={`/shop/${p.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <div style={{ background: "var(--bg-secondary)", borderRadius: "0.75rem", overflow: "hidden", border: "1px solid var(--border)", height: "100%", display: "flex", flexDirection: "column" }}>
                    <div style={{ height: "200px", background: "var(--bg-primary)", position: "relative" }}>
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem" }}>🛍️</div>
                      )}
                    </div>
                    <div style={{ padding: "1rem", flexGrow: 1 }}>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.25rem", textTransform: "uppercase" }}>{p.subCategory ?? p.category}</div>
                      <h3 style={{ margin: "0 0 0.5rem", fontSize: "1rem", fontWeight: "600" }}>{p.name}</h3>
                      {p.description && <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--text-secondary)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.description}</p>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
