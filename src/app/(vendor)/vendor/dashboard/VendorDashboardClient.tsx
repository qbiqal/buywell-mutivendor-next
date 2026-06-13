"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./vendor-dashboard.module.css";

interface Stats {
  activeProducts: number;
  totalOrders: number;
  totalRevenue: number;
  pendingPayout: number;
  rating: string;
}
interface VendorInfo {
  storeName: string;
  storeSlug: string;
  logoUrl: string | null;
  status: string;
}
interface RecentOrder {
  orderId: string;
  orderNumber: string;
  subtotal: number;
  status: string;
  createdAt: string;
}

export default function VendorDashboardClient() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [vendor, setVendor] = useState<VendorInfo | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/vendor/dashboard")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setStats(d.stats);
          setVendor(d.vendor);
          setRecentOrders(d.recentOrders ?? []);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className={styles.loading}>Loading dashboard…</div>;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Dashboard</h1>
          {vendor && <p className={styles.sub}>Welcome back, <strong>{vendor.storeName}</strong></p>}
        </div>
        <Link href="/vendor/products/new" className={styles.addBtn}>+ Add Product</Link>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statIcon}>🛍️</span>
          <div>
            <span className={styles.statVal}>{stats?.activeProducts ?? 0}</span>
            <span className={styles.statLabel}>Active Products</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statIcon}>📦</span>
          <div>
            <span className={styles.statVal}>{stats?.totalOrders ?? 0}</span>
            <span className={styles.statLabel}>Total Orders</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statIcon}>💰</span>
          <div>
            <span className={styles.statVal}>₹{((stats?.totalRevenue ?? 0) / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
            <span className={styles.statLabel}>Total Revenue</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statIcon}>💸</span>
          <div>
            <span className={styles.statVal}>₹{((stats?.pendingPayout ?? 0) / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
            <span className={styles.statLabel}>Pending Payout</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statIcon}>⭐</span>
          <div>
            <span className={styles.statVal}>{stats?.rating ?? "0.00"}</span>
            <span className={styles.statLabel}>Rating</span>
          </div>
        </div>
      </div>

      <div className={styles.panels}>
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Recent Orders</h2>
            <Link href="/vendor/orders" className={styles.viewAll}>View all →</Link>
          </div>
          {recentOrders.length === 0 ? (
            <div className={styles.empty}>No orders yet.</div>
          ) : (
            <div className={styles.orderList}>
              {recentOrders.map((o) => (
                <div key={o.orderId} className={styles.orderRow}>
                  <div>
                    <span className={styles.orderNum}>{o.orderNumber}</span>
                    <span className={styles.orderDate}>{new Date(o.createdAt).toLocaleDateString("en-IN")}</span>
                  </div>
                  <div className={styles.orderRight}>
                    <span className={styles.orderAmt}>₹{(o.subtotal / 100).toFixed(0)}</span>
                    <span className={[styles.orderStatus, styles[o.status] ?? ""].join(" ")}>{o.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Quick Links</h2>
          </div>
          <div className={styles.quickLinks}>
            <Link href="/vendor/products" className={styles.quickLink}><span>🛍️</span> Manage Products</Link>
            <Link href="/vendor/orders" className={styles.quickLink}><span>📦</span> View Orders</Link>
            <Link href="/vendor/payouts" className={styles.quickLink}><span>💸</span> Payout History</Link>
            <Link href="/vendor/settings" className={styles.quickLink}><span>⚙️</span> Store Settings</Link>
            {vendor?.storeSlug && (
              <Link href={`/store/${vendor.storeSlug}`} className={styles.quickLink} target="_blank"><span>🌐</span> View Store Page</Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
