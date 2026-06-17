"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import styles from "./admin-commissions.module.css";

interface Commission {
  id: number;
  orderId: string;
  vendorId: number;
  grossAmount: number;
  commissionRate: number;
  commissionAmount: number;
  vendorPayout: number;
  status: string;
  createdAt: string;
  storeName: string | null;
  orderNumber: string | null;
}

interface Summary {
  total: number;
  totalGross: number | null;
  totalCommission: number | null;
  totalVendorPayout: number | null;
}

interface Vendor {
  id: number;
  storeName: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending:    "#f59e0b",
  cleared:    "#3b82f6",
  cancelled:  "#6b7280",
};

export default function AdminCommissionsClient() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [vendorFilter, setVendorFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (vendorFilter) params.set("vendorId", vendorFilter);
      if (statusFilter) params.set("status", statusFilter);
      
      const [commRes, vendorRes] = await Promise.all([
        fetch(`/api/admin/commissions?${params}`),
        fetch("/api/admin/vendors"),
      ]);
      const [cd, vd] = await Promise.all([commRes.json(), vendorRes.json()]);
      if (cd.success) {
        setCommissions(cd.commissions);
        setSummary(cd.summary);
      }
      if (vd.success) setVendors(vd.vendors);
    } finally {
      setLoading(false);
    }
  }, [vendorFilter, statusFilter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Commission Statement</h1>
        <div className={styles.headerRight}>
          <select className={styles.select} value={vendorFilter} onChange={(e) => setVendorFilter(e.target.value)}>
            <option value="">All Vendors</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>{v.storeName}</option>
            ))}
          </select>
          <select className={styles.select} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="cleared">Cleared / Paid</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <Link href="/admin/payouts" className={styles.select} style={{ textAlign: "center", textDecoration: "none", background: "var(--bg-primary)" }}>
            Go to Payouts →
          </Link>
        </div>
      </div>

      {summary && (
        <div className={styles.summaryCards}>
          <div className={styles.card}>
            <span className={styles.cardLabel}>Transactions</span>
            <span className={styles.cardValue}>{summary.total}</span>
          </div>
          <div className={styles.card}>
            <span className={styles.cardLabel}>Gross Sales</span>
            <span className={styles.cardValue}>₹{((Number(summary.totalGross) || 0) / 100).toLocaleString("en-IN")}</span>
          </div>
          <div className={styles.card}>
            <span className={styles.cardLabel}>Platform Commission</span>
            <span className={[styles.cardValue, styles.green].join(" ")}>₹{((Number(summary.totalCommission) || 0) / 100).toLocaleString("en-IN")}</span>
          </div>
          <div className={styles.card}>
            <span className={styles.cardLabel}>Vendor Payouts</span>
            <span className={styles.cardValue}>₹{((Number(summary.totalVendorPayout) || 0) / 100).toLocaleString("en-IN")}</span>
          </div>
        </div>
      )}

      {loading ? (
        <div className={styles.empty}>Loading…</div>
      ) : commissions.length === 0 ? (
        <div className={styles.empty}>No commissions found.</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr>
              <th>Order</th>
              <th>Date</th>
              <th>Vendor</th>
              <th>Gross</th>
              <th>Rate</th>
              <th>Commission</th>
              <th>Vendor Earns</th>
              <th>Status</th>
            </tr></thead>
            <tbody>
              {commissions.map((c) => {
                const sc = STATUS_COLORS[c.status] ?? "#6b7280";
                return (
                  <tr key={c.id}>
                    <td className={styles.ref}>
                      <Link href={`/admin/orders/${c.orderId}`} style={{ color: "var(--green)" }}>{c.orderNumber}</Link>
                    </td>
                    <td>{new Date(c.createdAt).toLocaleDateString("en-IN")}</td>
                    <td>{c.storeName ?? `Vendor #${c.vendorId}`}</td>
                    <td className={styles.amt}>₹{(c.grossAmount / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                    <td>{(c.commissionRate / 100).toFixed(1)}%</td>
                    <td className={styles.amt} style={{ color: "var(--green)" }}>₹{(c.commissionAmount / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                    <td className={styles.amt}>₹{(c.vendorPayout / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                    <td><span className={styles.badge} style={{ color: sc, background: sc + "18" }}>{c.status}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
