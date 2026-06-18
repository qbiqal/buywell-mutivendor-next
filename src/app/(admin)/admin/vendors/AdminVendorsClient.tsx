"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { formatDateTime } from "@/lib/utils";
import styles from "./admin-vendors.module.css";

interface VendorRow {
  id: number;
  storeName: string;
  storeSlug: string;
  email: string | null;
  phone: string | null;
  status: string;
  rating: string;
  totalSales: number;
  totalOrders: number;
  commissionOverride: number | null;
  createdAt: string;
  userId: string;
  logoUrl: string | null;
  userEmail: string | null;
  userName: string | null;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:   { label: "Pending",   color: "#f59e0b" },
  approved:  { label: "Approved",  color: "#0d7659" },
  rejected:  { label: "Rejected",  color: "#dc2626" },
  suspended: { label: "Suspended", color: "#6b7280" },
};

export default function AdminVendorsClient() {
  const toast = useToast();
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [actioning, setActioning] = useState<number | null>(null);
  const [confirmState, setConfirmState] = useState<{open: boolean; title: string; message: string; onConfirm: () => void}>({open: false, title: "", message: "", onConfirm: () => {}});

  function openConfirm(title: string, message: string): Promise<boolean> {
    return new Promise((resolve) => {
      setConfirmState({ open: true, title, message, onConfirm: () => { setConfirmState(s => ({...s, open: false})); resolve(true); } });
    });
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/admin/vendors?${params}`);
      const data = await res.json();
      if (data.success) setVendors(data.vendors);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  async function handleAction(id: number, action: string) {
    setActioning(id);
    try {
      const res = await fetch(`/api/admin/vendors/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Action failed."); return; }
      toast.success(`Vendor ${action}d.`);
      load();
    } catch {
      toast.error("Network error.");
    } finally {
      setActioning(null);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Vendors</h1>
        <div className={styles.summary}>
          <span>{vendors.filter((v) => v.status === "pending").length} pending</span>
          <span>{vendors.filter((v) => v.status === "approved").length} approved</span>
        </div>
      </div>

      <div className={styles.filters}>
        <input
          className={styles.search}
          placeholder="Search store name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className={styles.select} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {loading ? (
        <div className={styles.empty}>Loading…</div>
      ) : vendors.length === 0 ? (
        <div className={styles.empty}>No vendors found.</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Store</th>
                <th>User</th>
                <th>Status</th>
                <th>Orders</th>
                <th>Sales</th>
                <th>Rating</th>
                <th>Applied</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {vendors.map((v) => {
                const st = STATUS_LABELS[v.status] ?? { label: v.status, color: "#6b7280" };
                return (
                  <tr key={v.id}>
                    <td>
                      <div className={styles.storeCell}>
                        {v.logoUrl ? (
                          <img src={v.logoUrl} alt="" className={styles.logo} />
                        ) : (
                          <div className={styles.logoPlaceholder}>{v.storeName[0]}</div>
                        )}
                        <div>
                          <Link href={`/admin/vendors/${v.id}`} className={styles.storeName}>{v.storeName}</Link>
                          <div className={styles.storeSlug}>/{v.storeSlug}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className={styles.userCell}>
                        <span>{v.userName ?? "—"}</span>
                        <span className={styles.userEmail}>{v.userEmail ?? "—"}</span>
                      </div>
                    </td>
                    <td>
                      <span className={styles.badge} style={{ color: st.color, background: st.color + "18" }}>
                        {st.label}
                      </span>
                    </td>
                    <td>{v.totalOrders}</td>
                    <td>₹{(v.totalSales / 100).toFixed(0)}</td>
                    <td>{v.rating}</td>
                    <td>{formatDateTime(v.createdAt)}</td>
                    <td>
                      <div className={styles.actions}>
                        <Link href={`/admin/vendors/${v.id}`} className={styles.viewBtn}>View</Link>
                        {v.status === "pending" && (
                          <>
                            <button
                              className={styles.approveBtn}
                              onClick={() => handleAction(v.id, "approve")}
                              disabled={actioning === v.id}
                            >Approve</button>
                            <button
                              className={styles.rejectBtn}
                              onClick={() => handleAction(v.id, "reject")}
                              disabled={actioning === v.id}
                            >Reject</button>
                          </>
                        )}
                        {v.status === "approved" && (
                          <>
                            <button
                              className={styles.suspendBtn}
                              onClick={() => handleAction(v.id, "suspend")}
                              disabled={actioning === v.id}
                            >Suspend</button>
                            <button
                              className={styles.impersonateBtn}
                              disabled={actioning === v.id}
                              onClick={async () => {
                                if (!(await openConfirm("Impersonate Vendor", `Log in as vendor "${v.storeName}" (${v.userEmail ?? v.email ?? ""})? Your admin session will be paused.`))) return;
                                const res = await fetch(`/api/admin/vendors/${v.id}/impersonate`, { method: "POST" });
                                const data = await res.json();
                                if (data.success) { window.location.href = "/vendor/dashboard"; }
                                else { toast.error(data.error || "Impersonation failed"); }
                              }}
                            >🎭 Impersonate</button>
                          </>
                        )}
                        {v.status === "suspended" && (
                          <button
                            className={styles.approveBtn}
                            onClick={() => handleAction(v.id, "unsuspend")}
                            disabled={actioning === v.id}
                          >Unsuspend</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <ConfirmModal
        isOpen={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState(s => ({...s, open: false}))}
        variant="warning"
      />
    </div>
  );
}
