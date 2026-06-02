"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { OrderTimeline } from "@/components/checkout/OrderTimeline";
import type { OrderStatus } from "@/types";
import styles from "./order-detail.module.css";

interface OrderDetail {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: string;
  subtotalInr: number;
  shippingInr: number;
  totalInr: number;
  addressSnapshot: Record<string, string> | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  courier: string | null;
  estimatedDelivery: string | null;
  isSampleRequest: boolean;
  createdAt: string;
  items: Array<{ productSnapshot: Record<string, string>; variantId: string; quantity: number; unitPriceInr: number; totalInr: number }>;
  history: Array<{ status: string; createdAt: string; note: string | null }>;
}

export default function OrderDetailClient() {
  const params   = useParams();
  const router   = useRouter();
  const [order,   setOrder]   = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refundReason, setRefundReason] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundNote, setRefundNote] = useState("");
  const [refundMessage, setRefundMessage] = useState("");
  const [submittingRefund, setSubmittingRefund] = useState(false);

  useEffect(() => {
    fetch(`/api/customer/orders/${params.id}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setOrder(d.data); })
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <div className="customer-content"><Spinner size="lg" /></div>;
  if (!order)  return <div className="customer-content"><p>Order not found.</p></div>;
  const currentOrder = order;

  const addr = currentOrder.addressSnapshot;
  const canRequestRefund = !currentOrder.isSampleRequest && ["payment_verified", "confirmed", "processing", "shipped", "delivered"].includes(currentOrder.status);

  async function submitRefund() {
    setSubmittingRefund(true);
    setRefundMessage("");
    try {
      const amountPaise = refundAmount ? Math.round(Number(refundAmount) * 100) : currentOrder.totalInr;
      const json = await fetch("/api/customer/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: currentOrder.id,
          requestedAmountInr: amountPaise,
          reason: refundReason,
          customerNote: refundNote,
        }),
      }).then((res) => res.json());
      if (json.success) {
        setRefundReason("");
        setRefundAmount("");
        setRefundNote("");
        setRefundMessage("Refund request submitted for review.");
      } else {
        setRefundMessage(json.error ?? "Refund request failed");
      }
    } finally {
      setSubmittingRefund(false);
    }
  }

  return (
    <div className="customer-content">
      <button onClick={() => router.back()} className={styles.backBtn}>← Back to Orders</button>

      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{order.orderNumber}</h1>
          <p className={styles.date}>{new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
        </div>
        <Badge statusKey={order.status} dot>{order.status.replace(/_/g, " ")}</Badge>
      </div>

      <div className={styles.layout}>
        {/* Left */}
        <div>
          {/* Timeline */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Order Status</h2>
            <OrderTimeline currentStatus={order.status} history={order.history} />
          </div>

          {/* Items */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>{order.isSampleRequest ? "Sample Request" : "Items Ordered"}</h2>
            {order.isSampleRequest ? (
              <div className={styles.sampleNote}>🍯 Free sample will be chosen by our team and shipped to your address.</div>
            ) : (
              order.items.map((item) => (
                <div key={item.variantId} className={styles.item}>
                  <div className={styles.itemInfo}>
                    <p className={styles.itemName}>{item.productSnapshot.productName}</p>
                    <p className={styles.itemVariant}>{item.productSnapshot.variantName} × {item.quantity}</p>
                  </div>
                  <p className={styles.itemPrice}>₹{(item.totalInr / 100).toLocaleString("en-IN")}</p>
                </div>
              ))
            )}
            {!order.isSampleRequest && (
              <>
                <div className={styles.divider} />
                <div className={styles.totals}>
                  <div className={styles.totalRow}><span>Subtotal</span><span>₹{(order.subtotalInr / 100).toLocaleString("en-IN")}</span></div>
                  <div className={styles.totalRow}><span>Shipping</span><span>{order.shippingInr === 0 ? "Free" : `₹${(order.shippingInr / 100).toLocaleString("en-IN")}`}</span></div>
                  <div className={[styles.totalRow, styles.grandTotal].join(" ")}>
                    <span>Total</span><span>₹{(order.totalInr / 100).toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right */}
        <div>
          {/* Delivery address */}
          {addr && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Delivery Address</h2>
              <address className={styles.address}>
                <strong>{addr.name}</strong><br />
                {addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}<br />
                {addr.city}, {addr.state} – {addr.pincode}<br />
                📞 {addr.phone}
              </address>
            </div>
          )}

          {/* Tracking */}
          {order.trackingNumber && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Tracking</h2>
              <div className={styles.trackingBox}>
                <div className={styles.trackingRow}>
                  <span>Courier:</span><strong>{order.courier}</strong>
                </div>
                <div className={styles.trackingRow}>
                  <span>Tracking #:</span><strong>{order.trackingNumber}</strong>
                </div>
                {order.estimatedDelivery && (
                  <div className={styles.trackingRow}>
                    <span>Expected:</span><strong>{order.estimatedDelivery}</strong>
                  </div>
                )}
                {order.trackingUrl && (
                  <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className={styles.trackLink}>
                    Track Package →
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Need payment? */}
          {(order.status === "pending" || order.status === "payment_pending") && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Complete Payment</h2>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 16 }}>
                Your order is waiting for payment. Please complete the payment to proceed.
              </p>
              <Button
                variant="primary"
                fullWidth
                onClick={() => router.push(`/checkout/payment?orderId=${order.id}&orderNumber=${order.orderNumber}&total=${order.totalInr}`)}
              >
                Pay Now →
              </Button>
            </div>
          )}

          {/* Support */}
          {canRequestRefund && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Request Refund</h2>
              <div className={styles.refundForm}>
                <input
                  type="number"
                  min="1"
                  max={order.totalInr / 100}
                  step="0.01"
                  value={refundAmount}
                  onChange={(event) => setRefundAmount(event.target.value)}
                  placeholder={`Amount up to Rs ${(order.totalInr / 100).toFixed(2)}`}
                />
                <select value={refundReason} onChange={(event) => setRefundReason(event.target.value)}>
                  <option value="">Select reason</option>
                  <option value="damaged_product">Damaged product</option>
                  <option value="wrong_item">Wrong item</option>
                  <option value="quality_issue">Quality issue</option>
                  <option value="delivery_issue">Delivery issue</option>
                  <option value="other">Other</option>
                </select>
                <textarea value={refundNote} onChange={(event) => setRefundNote(event.target.value)} placeholder="Add details for support" />
                <Button variant="outline" fullWidth loading={submittingRefund} disabled={!refundReason} onClick={submitRefund}>
                  Submit Refund Request
                </Button>
                {refundMessage && <p className={styles.refundMessage}>{refundMessage}</p>}
              </div>
            </div>
          )}

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Need Help?</h2>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 12 }}>
              Have questions about your order?
            </p>
            <a href={`https://wa.me/919470309006?text=Hi, I have a question about my order ${order.orderNumber}`} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" fullWidth>💬 WhatsApp Support</Button>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
