"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import styles from "./admin-vendor-detail.module.css";

interface Vendor {
  id: number;
  storeName: string;
  storeSlug: string;
  storeDescription: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  gstin: string | null;
  pan: string | null;
  bankAccount: string | null;
  bankIfsc: string | null;
  bankName: string | null;
  accountHolder: string | null;
  status: string;
  commissionOverride: number | null;
  totalSales: number;
  totalOrders: number;
  rating: string;
  adminRating: number | null;
  adminRatingNote: string | null;
  isFeatured: boolean;
  approvedAt: string | null;
  rejectedAt: string | null;
  rejectedReason: string | null;
  createdAt: string;
  userEmail: string | null;
  userName: string | null;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:   { label: "Pending",   color: "#f59e0b" },
  approved:  { label: "Approved",  color: "#0d7659" },
  rejected:  { label: "Rejected",  color: "#dc2626" },
  suspended: { label: "Suspended", color: "#6b7280" },
};

export default function AdminVendorDetailClient({ id }: { id: string }) {
  const toast = useToast();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState(false);
  const [commission, setCommission] = useState("");
  const [rejectedReason, setRejectedReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [adminRating, setAdminRating] = useState<number>(0);
  const [adminRatingNote, setAdminRatingNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/vendors/${id}`);
      const data = await res.json();
      if (data.success) {
        setVendor(data.vendor);
        setCommission(data.vendor.commissionOverride != null ? String(data.vendor.commissionOverride) : "");
        setAdminRating(data.vendor.adminRating ?? 0);
        setAdminRatingNote(data.vendor.adminRatingNote ?? "");
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleAction(action: string, extra?: Record<string, unknown>) {
    setActioning(true);
    try {
      const res = await fetch(`/api/admin/vendors/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Action failed."); return; }
      toast.success(`Vendor ${action}d.`);
      setShowRejectModal(false);
      load();
    } catch {
      toast.error("Network error.");
    } finally {
      setActioning(false);
    }
  }

  async function saveCommission() {
    const val = commission.trim() === "" ? null : parseInt(commission, 10);
    if (val !== null && (isNaN(val) || val < 0 || val > 10000)) {
      toast.error("Commission must be 0–10000 basis points.");
      return;
    }
    setActioning(true);
    try {
      const res = await fetch(`/api/admin/vendors/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commissionOverride: val }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Save failed."); return; }
      toast.success("Commission rate saved.");
      load();
    } catch {
      toast.error("Network error.");
    } finally {
      setActioning(false);
    }
  }

  async function saveAdminRating() {
    setActioning(true);
    try {
      const res = await fetch(`/api/admin/vendors/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminRating: adminRating || null, adminRatingNote: adminRatingNote || null }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Save failed."); return; }
      toast.success("Admin rating saved.");
      load();
    } catch { toast.error("Network error."); }
    finally { setActioning(false); }
  }

  if (loading) return <div className={styles.loading}>Loading…</div>;
  if (!vendor) return <div className={styles.loading}>Vendor not found.</div>;

  const st = STATUS_LABELS[vendor.status] ?? { label: vendor.status, color: "#6b7280" };

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <Link href="/admin/vendors" className={styles.backLink}>← All Vendors</Link>
        <span className={styles.badge} style={{ color: st.color, background: st.color + "18" }}>{st.label}</span>
      </div>

      {/* Header */}
      <div className={styles.storeHeader}>
        {vendor.logoUrl ? (
          <img src={vendor.logoUrl} alt="" className={styles.logo} />
        ) : (
          <div className={styles.logoPlaceholder}>{vendor.storeName[0]}</div>
        )}
        <div>
          <h1 className={styles.storeName}>{vendor.storeName}</h1>
          <p className={styles.storeSlug}>buywell.in/store/{vendor.storeSlug}</p>
          {vendor.storeDescription && <p className={styles.storeDesc}>{vendor.storeDescription}</p>}
        </div>
      </div>

      <div className={styles.grid}>
        {/* Stats */}
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <span className={styles.statVal}>₹{(vendor.totalSales / 100).toFixed(0)}</span>
            <span className={styles.statLabel}>Total Sales</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statVal}>{vendor.totalOrders}</span>
            <span className={styles.statLabel}>Total Orders</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statVal}>{vendor.rating}</span>
            <span className={styles.statLabel}>Rating</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statVal}>{vendor.commissionOverride != null ? `${(vendor.commissionOverride / 100).toFixed(1)}%` : "Default"}</span>
            <span className={styles.statLabel}>Commission</span>
          </div>
        </div>

        {/* Info */}
        <div className={styles.infoCard}>
          <h3 className={styles.cardTitle}>Seller Info</h3>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}><span>Owner</span><strong>{vendor.userName ?? "—"}</strong></div>
            <div className={styles.infoItem}><span>Account Email</span><strong>{vendor.userEmail ?? "—"}</strong></div>
            <div className={styles.infoItem}><span>Store Email</span><strong>{vendor.email ?? "—"}</strong></div>
            <div className={styles.infoItem}><span>Phone</span><strong>{vendor.phone ?? "—"}</strong></div>
            <div className={styles.infoItem}><span>City</span><strong>{[vendor.city, vendor.state, vendor.pincode].filter(Boolean).join(", ") || "—"}</strong></div>
            <div className={styles.infoItem}><span>Applied</span><strong>{new Date(vendor.createdAt).toLocaleDateString("en-IN")}</strong></div>
            {vendor.approvedAt && <div className={styles.infoItem}><span>Approved</span><strong>{new Date(vendor.approvedAt).toLocaleDateString("en-IN")}</strong></div>}
            {vendor.rejectedAt && <div className={styles.infoItem}><span>Rejected</span><strong>{new Date(vendor.rejectedAt).toLocaleDateString("en-IN")}</strong></div>}
            {vendor.rejectedReason && <div className={styles.infoItem}><span>Rejection Reason</span><strong>{vendor.rejectedReason}</strong></div>}
          </div>
        </div>

        {/* Bank & Tax */}
        <div className={styles.infoCard}>
          <h3 className={styles.cardTitle}>Bank &amp; Tax</h3>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}><span>GSTIN</span><strong>{vendor.gstin ?? "—"}</strong></div>
            <div className={styles.infoItem}><span>PAN</span><strong>{vendor.pan ?? "—"}</strong></div>
            <div className={styles.infoItem}><span>Bank Account</span><strong>{vendor.bankAccount ? `••••${vendor.bankAccount.slice(-4)}` : "—"}</strong></div>
            <div className={styles.infoItem}><span>IFSC</span><strong>{vendor.bankIfsc ?? "—"}</strong></div>
            <div className={styles.infoItem}><span>Bank Name</span><strong>{vendor.bankName ?? "—"}</strong></div>
            <div className={styles.infoItem}><span>Account Holder</span><strong>{vendor.accountHolder ?? "—"}</strong></div>
          </div>
        </div>

        {/* Commission override */}
        <div className={styles.infoCard}>
          <h3 className={styles.cardTitle}>Commission Override</h3>
          <p className={styles.cardHelp}>Set a per-vendor commission rate in basis points (100 = 1%). Leave empty to use the global default.</p>
          <div className={styles.commissionRow}>
            <input
              type="number"
              className={styles.commissionInput}
              value={commission}
              onChange={(e) => setCommission(e.target.value)}
              placeholder="e.g. 1000 = 10%"
              min={0}
              max={10000}
            />
            <button className={styles.saveBtn} onClick={saveCommission} disabled={actioning}>Save</button>
          </div>
        </div>

        {/* Actions */}
        <div className={styles.actionsCard}>
          <h3 className={styles.cardTitle}>Actions</h3>
          <div className={styles.actionBtns}>
            {vendor.status === "pending" && (
              <>
                <button className={styles.approveBtn} onClick={() => handleAction("approve")} disabled={actioning}>
                  ✓ Approve Vendor
                </button>
                <button className={styles.rejectBtn} onClick={() => setShowRejectModal(true)} disabled={actioning}>
                  ✕ Reject Application
                </button>
              </>
            )}
            {vendor.status === "approved" && (
              <button className={styles.suspendBtn} onClick={() => handleAction("suspend")} disabled={actioning}>
                Suspend Vendor
              </button>
            )}
            {vendor.status === "suspended" && (
              <button className={styles.approveBtn} onClick={() => handleAction("unsuspend")} disabled={actioning}>
                Reinstate Vendor
              </button>
            )}
            {vendor.status === "rejected" && (
              <button className={styles.approveBtn} onClick={() => handleAction("approve")} disabled={actioning}>
                Approve (Override)
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Reject modal */}
      {showRejectModal && (
        <div className={styles.overlay} onClick={() => setShowRejectModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Reject Application</h3>
            <p className={styles.modalHelp}>Optionally provide a reason that will be shared with the seller.</p>
            <textarea
              className={styles.reasonInput}
              rows={3}
              value={rejectedReason}
              onChange={(e) => setRejectedReason(e.target.value)}
              placeholder="e.g. Incomplete bank details, duplicate store name…"
            />
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setShowRejectModal(false)}>Cancel</button>
              <button
                className={styles.rejectBtn}
                onClick={() => handleAction("reject", { rejectedReason: rejectedReason || null })}
                disabled={actioning}
              >Confirm Rejection</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
