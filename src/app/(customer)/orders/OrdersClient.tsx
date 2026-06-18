"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import type { Order } from "@/lib/db/schema";
import { formatDateTime } from "@/lib/utils";
import styles from "./orders.module.css";

type OrderWithItems = Order & { items: { quantity: number; productSnapshot: Record<string, unknown> }[] };

const STATUS_LABELS: Record<string, string> = {
  pending:           "Pending",
  payment_pending:   "Awaiting Payment",
  payment_uploaded:  "Proof Uploaded",
  payment_verified:  "Payment Verified",
  confirmed:         "Confirmed",
  processing:        "Processing",
  shipped:           "Shipped",
  delivered:         "Delivered",
  cancelled:         "Cancelled",
};

export default function OrdersClient() {
  const [orders,  setOrders]  = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/customer/orders")
      .then((r) => r.json())
      .then((d) => { if (d.success) setOrders(d.data); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="customer-content">
      <div className="admin-page-header">
        <h1 className="admin-page-title">My Orders</h1>
        <p className="admin-page-subtitle">Track all your BuyWell Marketplace orders</p>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
          <Spinner size="lg" />
        </div>
      ) : orders.length === 0 ? (
        <div className={styles.empty}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🛒</div>
          <h2>No orders yet</h2>
          <p>When you place an order, it will appear here.</p>
          <Link href="/shop" className={styles.shopLink}>Browse Products →</Link>
        </div>
      ) : (
        <div className={styles.orderList}>
          {orders.map((order) => (
            <Link key={order.id} href={`/orders/${order.id}`} className={styles.orderCard}>
              <div className={styles.orderTop}>
                <div>
                  <p className={styles.orderNumber}>{order.orderNumber}</p>
                  <p className={styles.orderDate}>{formatDateTime(order.createdAt)}</p>
                </div>
                <Badge statusKey={order.status}>{STATUS_LABELS[order.status] ?? order.status}</Badge>
              </div>
              <div className={styles.orderItems}>
                {order.items.slice(0, 2).map((item, i) => (
                  <span key={i} className={styles.itemChip}>
                    {(item.productSnapshot as { productName?: string }).productName} ×{item.quantity}
                  </span>
                ))}
                {order.items.length > 2 && <span className={styles.itemMore}>+{order.items.length - 2} more</span>}
              </div>
              <div className={styles.orderBottom}>
                <span className={styles.orderTotal}>₹{(order.totalInr / 100).toLocaleString("en-IN")}</span>
                <span className={styles.viewDetails}>View Details →</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
