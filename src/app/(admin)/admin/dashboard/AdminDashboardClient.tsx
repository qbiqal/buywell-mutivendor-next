"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import styles from "./dashboard.module.css";

interface DashboardStats {
  ordersToday:       number;
  pendingVerification: number;
  revenueThisMonth:  number;
  newCustomers:      number;
  recentOrders:      Array<{
    id: string; orderNumber: string; status: string;
    totalInr: number; createdAt: string;
    guestName?: string; guestPhone?: string;
  }>;
}

export default function AdminDashboardClient() {
  const [stats, setStats]   = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/analytics/dashboard")
      .then((r) => r.json())
      .then((d) => { if (d.success) setStats(d.data); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className={styles.content}><Spinner size="lg" /></div>;

  const s = stats ?? { ordersToday: 0, pendingVerification: 0, revenueThisMonth: 0, newCustomers: 0, recentOrders: [] };

  return (
    <div className={styles.content}>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Dashboard</h1>
        <p className="admin-page-subtitle">Welcome back, Admin</p>
      </div>

      {/* Stat cards */}
      <div className={styles.statsGrid}>
        <Card padding="md" className={styles.statCard}>
          <p className={styles.statLabel}>Orders Today</p>
          <p className={styles.statValue}>{s.ordersToday}</p>
          <p className={styles.statMeta}>New orders</p>
        </Card>
        <Card padding="md" className={[styles.statCard, styles.urgentCard].join(" ")}>
          <p className={styles.statLabel}>Pending Verification</p>
          <p className={styles.statValue}>{s.pendingVerification}</p>
          <p className={styles.statMeta}>Need action</p>
        </Card>
        <Card padding="md" className={styles.statCard}>
          <p className={styles.statLabel}>Revenue (Month)</p>
          <p className={styles.statValue}>₹{(s.revenueThisMonth / 100).toLocaleString("en-IN")}</p>
          <p className={styles.statMeta}>This month</p>
        </Card>
        <Card padding="md" className={styles.statCard}>
          <p className={styles.statLabel}>New Customers</p>
          <p className={styles.statValue}>{s.newCustomers}</p>
          <p className={styles.statMeta}>This week</p>
        </Card>
      </div>

      {/* Recent orders */}
      <Card padding="none" className={styles.tableCard}>
        <div className={styles.tableHeader}>
          <h2 className={styles.tableTitle}>Recent Orders</h2>
          <Link href="/admin/orders" className={styles.viewAll}>View All →</Link>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {s.recentOrders.length === 0 ? (
                <tr><td colSpan={6} className={styles.emptyRow}>No orders yet</td></tr>
              ) : s.recentOrders.map((order) => (
                <tr key={order.id}>
                  <td className={styles.orderNum}>{order.orderNumber}</td>
                  <td>{order.guestName ?? "—"}<br/><span className={styles.phone}>{order.guestPhone ?? ""}</span></td>
                  <td>₹{(order.totalInr / 100).toLocaleString("en-IN")}</td>
                  <td><Badge statusKey={order.status}>{order.status.replace(/_/g, " ")}</Badge></td>
                  <td className={styles.date}>{new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</td>
                  <td><Link href={`/admin/orders/${order.id}`} className={styles.viewLink}>View</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Quick actions */}
      <div className={styles.quickActions}>
        <Link href="/admin/orders?status=payment_uploaded" className={styles.qaBtn}>
          <span>📸</span> Verify Payments ({s.pendingVerification})
        </Link>
        <Link href="/admin/products/new" className={styles.qaBtn}>
          <span>➕</span> New Product
        </Link>
        <Link href="/admin/blog/new" className={styles.qaBtn}>
          <span>✍️</span> New Blog Post
        </Link>
        <Link href="/admin/cms" className={styles.qaBtn}>
          <span>🎨</span> Edit Landing Page
        </Link>
      </div>
    </div>
  );
}
