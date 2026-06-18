"use client";

import { useState, useEffect, useCallback } from "react";
import { formatDateTime } from "@/lib/utils";
import styles from "./vendor-orders.module.css";

interface OrderRow {
  id: number;
  orderId: string;
  orderNumber: string;
  subtotal: number;
  status: string;
  orderStatus: string;
  createdAt: string;
  guestName: string | null;
  userId: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  pending:   "#f59e0b",
  confirmed: "#3b82f6",
  shipped:   "#8b5cf6",
  delivered: "#0d7659",
  cancelled: "#dc2626",
};

export default function VendorOrdersClient() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/vendor/orders?${params}`);
      const data = await res.json();
      if (data.success) setOrders(data.orders);
    } finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Orders</h1>
        <select className={styles.select} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <div className={styles.empty}>Loading…</div>
      ) : orders.length === 0 ? (
        <div className={styles.empty}>No orders found.</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Your Split</th>
              <th>Order Status</th>
              <th>Split Status</th>
              <th>Date</th>
            </tr></thead>
            <tbody>
              {orders.map((o) => {
                const sc = STATUS_COLORS[o.status] ?? "#6b7280";
                const osc = STATUS_COLORS[o.orderStatus] ?? "#6b7280";
                return (
                  <tr key={o.id}>
                    <td><span className={styles.orderNum}>{o.orderNumber}</span></td>
                    <td>{o.guestName ?? (o.userId ? "Registered Customer" : "—")}</td>
                    <td className={styles.amt}>₹{(o.subtotal / 100).toFixed(0)}</td>
                    <td><span className={styles.badge} style={{ color: osc, background: osc + "18" }}>{o.orderStatus}</span></td>
                    <td><span className={styles.badge} style={{ color: sc, background: sc + "18" }}>{o.status}</span></td>
                    <td>{formatDateTime(o.createdAt)}</td>
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
