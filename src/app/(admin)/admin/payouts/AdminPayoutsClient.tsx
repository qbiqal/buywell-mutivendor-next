"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/ui/Toast";
import styles from "./admin-payouts.module.css";

interface Payout {
  id: number;
  vendorId: number;
  storeName: string | null;
  amount: number;
  status: string;
  paymentMethod: string | null;
  paymentReference: string | null;
  notes: string | null;
  initiatedAt: string;
  paidAt: string | null;
}

interface Vendor {
  id: number;
  storeName: string;
  commissionOverride: number | null;
}

const STATUS_COLORS: Record<string, string> = {
  pending:    "#f59e0b",
  processing: "#3b82f6",
  paid:       "#0d7659",
  failed:     "#dc2626",
  cancelled:  "#6b7280",
};

export default function AdminPayoutsClient() {
  const toast = useToast();
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [actioning, setActioning] = useState<number | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newForm, setNewForm] = useState({ vendorId: "", paymentMethod: "", paymentReference: "", notes: "" });
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      const [payRes, vendorRes] = await Promise.all([
        fetch(`/api/admin/payouts?${params}`),
        fetch("/api/admin/vendors"),
      ]);
      const [pd, vd] = await Promise.all([payRes.json(), vendorRes.json()]);
      if (pd.success) setPayouts(pd.payouts);
      if (vd.success) setVendors(vd.vendors);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  async function markPaid(id: number) {
    setActioning(id);
    try {
      const ref = prompt("Enter payment reference / UTR (optional):");
      const res = await fetch(`/api/admin/payouts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "paid", paymentReference: ref }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Update failed."); return; }
      toast.success("Payout marked as paid.");
      load();
    } catch { toast.error("Network error."); }
    finally { setActioning(null); }
  }

  async function createPayout() {
    if (!newForm.vendorId) { toast.error("Select a vendor."); return; }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newForm, vendorId: parseInt(newForm.vendorId, 10) }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Create failed."); return; }
      toast.success("Payout initiated.");
      setShowNewModal(false);
      setNewForm({ vendorId: "", paymentMethod: "", paymentReference: "", notes: "" });
      load();
    } catch { toast.error("Network error."); }
    finally { setCreating(false); }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Vendor Payouts</h1>
        <div className={styles.headerRight}>
          <select className={styles.select} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="paid">Paid</option>
            <option value="failed">Failed</option>
          </select>
          <button className={styles.addBtn} onClick={() => setShowNewModal(true)}>+ New Payout</button>
        </div>
      </div>

      {loading ? (
        <div className={styles.empty}>Loading…</div>
      ) : payouts.length === 0 ? (
        <div className={styles.empty}>No payouts found.</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr>
              <th>Vendor</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Method</th>
              <th>Reference</th>
              <th>Initiated</th>
              <th>Paid On</th>
              <th>Actions</th>
            </tr></thead>
            <tbody>
              {payouts.map((p) => {
                const sc = STATUS_COLORS[p.status] ?? "#6b7280";
                return (
                  <tr key={p.id}>
                    <td>{p.storeName ?? `Vendor #${p.vendorId}`}</td>
                    <td className={styles.amt}>₹{(p.amount / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                    <td><span className={styles.badge} style={{ color: sc, background: sc + "18" }}>{p.status}</span></td>
                    <td>{p.paymentMethod ?? "—"}</td>
                    <td className={styles.ref}>{p.paymentReference ?? "—"}</td>
                    <td>{new Date(p.initiatedAt).toLocaleDateString("en-IN")}</td>
                    <td>{p.paidAt ? new Date(p.paidAt).toLocaleDateString("en-IN") : "—"}</td>
                    <td>
                      {p.status === "processing" && (
                        <button
                          className={styles.paidBtn}
                          onClick={() => markPaid(p.id)}
                          disabled={actioning === p.id}
                        >Mark Paid</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* New payout modal */}
      {showNewModal && (
        <div className={styles.overlay} onClick={() => setShowNewModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Initiate Payout</h3>
            <div className={styles.field}>
              <label className={styles.label}>Vendor *</label>
              <select className={styles.input} value={newForm.vendorId} onChange={(e) => setNewForm((f) => ({ ...f, vendorId: e.target.value }))}>
                <option value="">Select vendor…</option>
                {vendors.filter((v) => (v as unknown as Record<string, unknown>).status === "approved" || true).map((v) => (
                  <option key={v.id} value={v.id}>{v.storeName}</option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Payment Method</label>
              <input className={styles.input} value={newForm.paymentMethod} onChange={(e) => setNewForm((f) => ({ ...f, paymentMethod: e.target.value }))} placeholder="e.g. NEFT, UPI, IMPS" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Reference / UTR</label>
              <input className={styles.input} value={newForm.paymentReference} onChange={(e) => setNewForm((f) => ({ ...f, paymentReference: e.target.value }))} placeholder="UTR number" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Notes</label>
              <textarea className={styles.textarea} rows={2} value={newForm.notes} onChange={(e) => setNewForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setShowNewModal(false)}>Cancel</button>
              <button className={styles.submitBtn} onClick={createPayout} disabled={creating}>
                {creating ? "Creating…" : "Initiate Payout"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
