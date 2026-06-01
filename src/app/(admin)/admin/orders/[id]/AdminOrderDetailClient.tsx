"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { OrderTimeline } from "@/components/checkout/OrderTimeline";
import { useToast } from "@/components/ui/Toast";
import type { OrderStatus } from "@/types";
import styles from "./admin-order-detail.module.css";

const ORDER_STATUSES: { value: OrderStatus; label: string }[] = [
  { value: "pending",           label: "Pending" },
  { value: "payment_uploaded",  label: "Payment Uploaded" },
  { value: "payment_verified",  label: "Payment Verified" },
  { value: "confirmed",         label: "Confirmed" },
  { value: "processing",        label: "Processing" },
  { value: "shipped",           label: "Shipped" },
  { value: "delivered",         label: "Delivered" },
  { value: "cancelled",         label: "Cancelled" },
];

interface AdminOrderDetail {
  id: string; orderNumber: string; status: OrderStatus; paymentStatus: string;
  paymentProofUrl: string | null; subtotalInr: number; shippingInr: number; totalInr: number;
  guestName: string | null; guestPhone: string | null; guestEmail: string | null;
  addressSnapshot: Record<string, string> | null; adminNotes: string | null;
  trackingNumber: string | null; trackingUrl: string | null; courier: string | null;
  estimatedDelivery: string | null; isSampleRequest: boolean; createdAt: string;
  items: Array<{ productSnapshot: Record<string, string>; quantity: number; unitPriceInr: number; totalInr: number }>;
  history: Array<{ status: string; createdAt: string; note: string | null }>;
}

export default function AdminOrderDetailClient() {
  const params = useParams();
  const router = useRouter();
  const { success: showSuccess, error: showError } = useToast();

  const [order,   setOrder]   = useState<AdminOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [whatsAppSending, setWhatsAppSending] = useState<string | null>(null);

  const [statusModal,   setStatusModal]   = useState(false);
  const [trackingModal, setTrackingModal] = useState(false);
  const [proofModal,    setProofModal]    = useState(false);

  const [newStatus,   setNewStatus]   = useState<OrderStatus>("confirmed");
  const [statusNote,  setStatusNote]  = useState("");
  const [adminNotes,  setAdminNotes]  = useState("");
  const [tracking,    setTracking]    = useState({ number: "", url: "", courier: "", estimatedDelivery: "" });

  useEffect(() => {
    fetch(`/api/admin/orders/${params.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setOrder(d.data);
          setAdminNotes(d.data.adminNotes ?? "");
          setTracking({
            number: d.data.trackingNumber ?? "", url: d.data.trackingUrl ?? "",
            courier: d.data.courier ?? "", estimatedDelivery: d.data.estimatedDelivery ?? "",
          });
        }
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  async function updateOrder(body: Record<string, unknown>) {
    setSaving(true);
    try {
      const res  = await fetch(`/api/admin/orders/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) { showError(data.error ?? "Update failed"); return; }
      showSuccess("Order updated!");
      // Refresh
      const refreshed = await fetch(`/api/admin/orders/${params.id}`).then((r) => r.json());
      if (refreshed.success) setOrder(refreshed.data);
      setStatusModal(false);
      setTrackingModal(false);
    } finally {
      setSaving(false);
    }
  }

  async function sendOrderWhatsApp(templateKey: "order_confirmed" | "order_shipped" | "payment_rejected") {
    setWhatsAppSending(templateKey);
    try {
      const res = await fetch(`/api/admin/orders/${params.id}/whatsapp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateKey }),
      });
      const data = await res.json();
      if (!data.success) {
        showError(data.error ?? "WhatsApp send failed");
        return;
      }
      showSuccess(data.data.status === "sent" ? "WhatsApp sent" : "WhatsApp logged");
    } finally {
      setWhatsAppSending(null);
    }
  }

  if (loading) return <div style={{ padding: 40 }}><Spinner size="lg" /></div>;
  if (!order)  return <div style={{ padding: 40 }}>Order not found.</div>;

  const addr = order.addressSnapshot;

  return (
    <div className={styles.content}>
      <button onClick={() => router.back()} className={styles.backBtn}>← Back to Orders</button>

      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{order.orderNumber}</h1>
          <p className={styles.meta}>{new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
        </div>
        <div className={styles.headerActions}>
          <Badge statusKey={order.status} dot>{order.status.replace(/_/g, " ")}</Badge>
          <Button variant="ghost" size="sm" onClick={() => setStatusModal(true)}>Update Status</Button>
        </div>
      </div>

      <div className={styles.layout}>
        {/* Left column */}
        <div>
          {/* Payment proof */}
          {order.paymentProofUrl && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Payment Proof</h2>
                <Badge statusKey={order.paymentStatus}>{order.paymentStatus.replace(/_/g, " ")}</Badge>
              </div>
              <div className={styles.proofWrap} onClick={() => setProofModal(true)}>
                <Image src={order.paymentProofUrl} alt="Payment proof" fill className={styles.proofThumb} />
                <div className={styles.proofOverlay}>🔍 View Full</div>
              </div>
              {order.paymentStatus === "uploaded" && (
                <div className={styles.verifyActions}>
                  <Button
                    variant="primary"
                    loading={saving}
                    onClick={() => updateOrder({ verifyPayment: true, note: "Payment verified by admin" })}
                  >
                    ✅ Verify Payment
                  </Button>
                  <Button
                    variant="danger"
                    loading={saving}
                    onClick={() => updateOrder({ status: "pending", note: "Payment proof rejected" })}
                  >
                    ❌ Reject Proof
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Order items */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>{order.isSampleRequest ? "Sample Request" : "Items"}</h2>
            {order.isSampleRequest ? (
              <div className={styles.sampleNote}>🍯 Free sample request — customer awaits our choice</div>
            ) : order.items.map((item, i) => (
              <div key={i} className={styles.item}>
                <div className={styles.itemInfo}>
                  <p className={styles.itemName}>{item.productSnapshot.productName}</p>
                  <p className={styles.itemVariant}>{item.productSnapshot.variantName} × {item.quantity}</p>
                </div>
                <p className={styles.itemPrice}>₹{(item.totalInr / 100).toLocaleString("en-IN")}</p>
              </div>
            ))}
            {!order.isSampleRequest && (
              <div className={styles.totals}>
                <div className={styles.totalRow}><span>Subtotal</span><span>₹{(order.subtotalInr / 100).toLocaleString("en-IN")}</span></div>
                <div className={styles.totalRow}><span>Shipping</span><span>{order.shippingInr === 0 ? "Free" : `₹${(order.shippingInr / 100).toLocaleString("en-IN")}`}</span></div>
                <div className={[styles.totalRow, styles.grandTotal].join(" ")}><span>Total</span><span>₹{(order.totalInr / 100).toLocaleString("en-IN")}</span></div>
              </div>
            )}
          </div>

          {/* Admin notes */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Admin Notes</h2>
            <Textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Internal notes about this order..."
              rows={3}
            />
            <Button variant="ghost" size="sm" loading={saving} onClick={() => updateOrder({ adminNotes })} style={{ marginTop: 8 }}>
              Save Notes
            </Button>
          </div>
        </div>

        {/* Right column */}
        <div>
          {/* Timeline */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Order Timeline</h2>
            <OrderTimeline currentStatus={order.status} history={order.history} />
          </div>

          {/* Customer info */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Customer</h2>
            <div className={styles.infoRows}>
              <div className={styles.infoRow}><span>Name:</span><strong>{order.guestName ?? "—"}</strong></div>
              <div className={styles.infoRow}><span>Phone:</span>
                <a href={`tel:${order.guestPhone}`} className={styles.phoneLink}>{order.guestPhone ?? "—"}</a>
              </div>
              {order.guestEmail && <div className={styles.infoRow}><span>Email:</span><span>{order.guestEmail}</span></div>}
            </div>
            {order.guestPhone && (
              <div className={styles.waActions}>
                <a
                  href={`https://wa.me/${order.guestPhone?.replace(/[^0-9]/g, "")}?text=Hi ${order.guestName}, regarding your order ${order.orderNumber}...`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.waBtn}
                >
                  💬 Open WhatsApp
                </a>
                <Button
                  variant="ghost"
                  size="sm"
                  loading={whatsAppSending === "order_confirmed"}
                  onClick={() => sendOrderWhatsApp("order_confirmed")}
                >
                  Resend Confirmed
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  loading={whatsAppSending === "order_shipped"}
                  onClick={() => sendOrderWhatsApp("order_shipped")}
                >
                  Resend Shipped
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  loading={whatsAppSending === "payment_rejected"}
                  onClick={() => sendOrderWhatsApp("payment_rejected")}
                >
                  Send Payment Issue
                </Button>
              </div>
            )}
          </div>

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
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Shipping</h2>
              <Button variant="ghost" size="sm" onClick={() => setTrackingModal(true)}>
                {order.trackingNumber ? "Update" : "Add Tracking"}
              </Button>
            </div>
            {order.trackingNumber ? (
              <div className={styles.infoRows}>
                <div className={styles.infoRow}><span>Courier:</span><strong>{order.courier}</strong></div>
                <div className={styles.infoRow}><span>Tracking #:</span><strong>{order.trackingNumber}</strong></div>
                {order.estimatedDelivery && <div className={styles.infoRow}><span>ETA:</span><strong>{order.estimatedDelivery}</strong></div>}
              </div>
            ) : <p className={styles.emptyNote}>No tracking info yet.</p>}
          </div>
        </div>
      </div>

      {/* Status modal */}
      <Modal isOpen={statusModal} onClose={() => setStatusModal(false)} title="Update Order Status">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-secondary)" }}>New Status</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
              {ORDER_STATUSES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setNewStatus(s.value)}
                  style={{
                    padding: "8px 14px", borderRadius: 999, fontSize: 13, fontWeight: 600,
                    background: newStatus === s.value ? "var(--ink)" : "var(--bg-secondary)",
                    color: newStatus === s.value ? "#fff" : "var(--text-primary)",
                    border: "1px solid var(--border-color)", cursor: "pointer",
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <Input label="Note (Optional)" value={statusNote} onChange={(e) => setStatusNote(e.target.value)} placeholder="Reason for status change" />
          <Button variant="primary" fullWidth loading={saving} onClick={() => updateOrder({ status: newStatus, note: statusNote })}>
            Update Status
          </Button>
        </div>
      </Modal>

      {/* Tracking modal */}
      <Modal isOpen={trackingModal} onClose={() => setTrackingModal(false)} title="Add Tracking Information">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Input label="Courier Name" value={tracking.courier} onChange={(e) => setTracking((p) => ({ ...p, courier: e.target.value }))} placeholder="e.g. Blue Dart, DTDC" />
          <Input label="Tracking Number" value={tracking.number} onChange={(e) => setTracking((p) => ({ ...p, number: e.target.value }))} placeholder="Tracking ID" />
          <Input label="Tracking URL (Optional)" value={tracking.url} onChange={(e) => setTracking((p) => ({ ...p, url: e.target.value }))} placeholder="https://..." />
          <Input label="Estimated Delivery" type="date" value={tracking.estimatedDelivery} onChange={(e) => setTracking((p) => ({ ...p, estimatedDelivery: e.target.value }))} />
          <Button variant="primary" fullWidth loading={saving} onClick={() => updateOrder({ status: "shipped", trackingNumber: tracking.number, trackingUrl: tracking.url, courier: tracking.courier, estimatedDelivery: tracking.estimatedDelivery })}>
            Save & Mark as Shipped
          </Button>
        </div>
      </Modal>

      {/* Proof full-screen modal */}
      <Modal isOpen={proofModal} onClose={() => setProofModal(false)} maxWidth="800px">
        {order.paymentProofUrl && (
          <div style={{ position: "relative", width: "100%", minHeight: 400 }}>
            <Image src={order.paymentProofUrl} alt="Payment proof full" fill style={{ objectFit: "contain" }} />
          </div>
        )}
      </Modal>
    </div>
  );
}
