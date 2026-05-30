"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { Input } from "@/components/ui/Input";
import type { Order } from "@/lib/db/schema";
import styles from "./admin-orders.module.css";

const STATUS_FILTERS = [
  { value: "",                 label: "All Orders" },
  { value: "payment_uploaded", label: "📸 Awaiting Verification" },
  { value: "confirmed",        label: "✅ Confirmed" },
  { value: "shipped",          label: "🚚 Shipped" },
  { value: "delivered",        label: "🏠 Delivered" },
  { value: "cancelled",        label: "❌ Cancelled" },
];

export default function AdminOrdersClient() {
  const router  = useRouter();
  const params  = useSearchParams();

  const [orders,   setOrders]   = useState<Order[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState(params.get("search") ?? "");
  const [status,   setStatus]   = useState(params.get("status") ?? "");
  const [page,     setPage]     = useState(1);
  const [total,    setTotal]    = useState(0);
  const LIMIT = 20;

  useEffect(() => {
    setLoading(true);
    const q = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    if (status) q.set("status", status);
    if (search) q.set("search", search);
    fetch(`/api/admin/orders?${q}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) { setOrders(d.data); setTotal(d.pagination.total); } })
      .finally(() => setLoading(false));
  }, [status, search, page]);

  return (
    <div className={styles.content}>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Orders</h1>
        <p className="admin-page-subtitle">Manage and verify all customer orders</p>
      </div>

      {/* Filters */}
      <div className={styles.filterBar}>
        <div className={styles.statusTabs}>
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => { setStatus(f.value); setPage(1); }}
              className={[styles.statusTab, status === f.value ? styles.active : ""].join(" ")}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className={styles.searchWrap}>
          <Input
            placeholder="Search by order #, name, phone..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ padding: "60px", display: "flex", justifyContent: "center" }}><Spinner size="lg" /></div>
      ) : (
        <>
          <div className={styles.tableCard}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr><td colSpan={7} className={styles.empty}>No orders found</td></tr>
                ) : orders.map((order) => (
                  <tr key={order.id} onClick={() => router.push(`/admin/orders/${order.id}`)} className={styles.clickRow}>
                    <td className={styles.orderNum}>{order.orderNumber}</td>
                    <td>
                      <p>{order.guestName ?? "—"}</p>
                      <p className={styles.phone}>{order.guestPhone ?? ""}</p>
                    </td>
                    <td>₹{(order.totalInr / 100).toLocaleString("en-IN")}</td>
                    <td><Badge statusKey={`${order.paymentStatus}`}>{order.paymentStatus.replace(/_/g, " ")}</Badge></td>
                    <td><Badge statusKey={order.status}>{order.status.replace(/_/g, " ")}</Badge></td>
                    <td className={styles.date}>{new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</td>
                    <td><Link href={`/admin/orders/${order.id}`} className={styles.viewLink} onClick={(e) => e.stopPropagation()}>View →</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > LIMIT && (
            <div className={styles.pagination}>
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className={styles.pageBtn}>← Prev</button>
              <span>Page {page} of {Math.ceil(total / LIMIT)}</span>
              <button disabled={page >= Math.ceil(total / LIMIT)} onClick={() => setPage((p) => p + 1)} className={styles.pageBtn}>Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
