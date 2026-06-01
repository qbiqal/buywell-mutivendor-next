"use client";
import React, { useDeferredValue, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { DataTableFilters, type DataTableFilterField } from "@/components/admin/DataTableFilters";
import type { Order } from "@/lib/db/schema";
import styles from "./admin-orders.module.css";

const STATUS_FILTERS = [
  { value: "",                 label: "All orders" },
  { value: "payment_uploaded", label: "Awaiting verification" },
  { value: "confirmed",        label: "Confirmed" },
  { value: "processing",       label: "Processing" },
  { value: "shipped",          label: "Shipped" },
  { value: "delivered",        label: "Delivered" },
  { value: "cancelled",        label: "Cancelled" },
];

const PAYMENT_FILTERS = [
  { value: "", label: "Any payment" },
  { value: "pending", label: "Pending" },
  { value: "uploaded", label: "Uploaded" },
  { value: "verified", label: "Verified" },
  { value: "rejected", label: "Rejected" },
];

const SAMPLE_FILTERS = [
  { value: "", label: "All order types" },
  { value: "false", label: "Paid orders" },
  { value: "true", label: "Sample requests" },
];

export default function AdminOrdersClient() {
  const router  = useRouter();
  const params  = useSearchParams();

  const [orders,   setOrders]   = useState<Order[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState(params.get("search") ?? "");
  const deferredSearch = useDeferredValue(search);
  const [status,   setStatus]   = useState(params.get("status") ?? "");
  const [paymentStatus, setPaymentStatus] = useState(params.get("paymentStatus") ?? "");
  const [sample, setSample] = useState(params.get("sample") ?? "");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [page,     setPage]     = useState(1);
  const [total,    setTotal]    = useState(0);
  const LIMIT = 20;

  useEffect(() => {
    setLoading(true);
    const q = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    if (status) q.set("status", status);
    if (deferredSearch) q.set("search", deferredSearch);
    if (paymentStatus) q.set("paymentStatus", paymentStatus);
    if (sample) q.set("sample", sample);
    if (dateFrom) q.set("dateFrom", dateFrom);
    if (dateTo) q.set("dateTo", dateTo);
    if (minAmount) q.set("minAmount", minAmount);
    if (maxAmount) q.set("maxAmount", maxAmount);
    fetch(`/api/admin/orders?${q}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) { setOrders(d.data); setTotal(d.pagination.total); } })
      .finally(() => setLoading(false));
  }, [status, deferredSearch, paymentStatus, sample, dateFrom, dateTo, minAmount, maxAmount, page]);

  const filterFields: DataTableFilterField[] = [
    { key: "status", label: "Order Status", type: "select", value: status, options: STATUS_FILTERS, onChange: (value) => { setStatus(value); setPage(1); } },
    { key: "paymentStatus", label: "Payment", type: "select", value: paymentStatus, options: PAYMENT_FILTERS, onChange: (value) => { setPaymentStatus(value); setPage(1); } },
    { key: "sample", label: "Type", type: "select", value: sample, options: SAMPLE_FILTERS, onChange: (value) => { setSample(value); setPage(1); } },
    { key: "dateFrom", label: "Date From", type: "date", value: dateFrom, onChange: (value) => { setDateFrom(value); setPage(1); } },
    { key: "dateTo", label: "Date To", type: "date", value: dateTo, onChange: (value) => { setDateTo(value); setPage(1); } },
    { key: "minAmount", label: "Min Amount (₹)", type: "number", min: 0, step: 1, value: minAmount, onChange: (value) => { setMinAmount(value); setPage(1); } },
    { key: "maxAmount", label: "Max Amount (₹)", type: "number", min: 0, step: 1, value: maxAmount, onChange: (value) => { setMaxAmount(value); setPage(1); } },
  ];

  function resetFilters() {
    setSearch("");
    setStatus("");
    setPaymentStatus("");
    setSample("");
    setDateFrom("");
    setDateTo("");
    setMinAmount("");
    setMaxAmount("");
    setPage(1);
  }

  return (
    <div className={styles.content}>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Orders</h1>
        <p className="admin-page-subtitle">Manage and verify all customer orders</p>
      </div>

      <DataTableFilters
        title="Order filters"
        subtitle="Filter by order/customer text, lifecycle, payment state, date range, amount, and sample requests."
        searchValue={search}
        searchPlaceholder="Search by order #, name, phone..."
        onSearchChange={(value) => { setSearch(value); setPage(1); }}
        fields={filterFields}
        onReset={resetFilters}
        resultLabel={`${total} result${total !== 1 ? "s" : ""}`}
      />

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
