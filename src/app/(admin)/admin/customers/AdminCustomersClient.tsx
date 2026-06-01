"use client";
import React, { useDeferredValue, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { DataTableFilters, type DataTableFilterField } from "@/components/admin/DataTableFilters";
import styles from "./admin-customers.module.css";

interface CustomerRow {
  id: string;
  email: string;
  firstName: string;
  lastName: string | null;
  phone: string | null;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
  orderCount: number;
  totalSpendInr: number;
  lastOrderAt: string | null;
}

const STATUS_FILTERS = [
  { value: "", label: "All customers" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const VERIFIED_FILTERS = [
  { value: "", label: "Any verification" },
  { value: "true", label: "Email verified" },
  { value: "false", label: "Email not verified" },
];

export default function AdminCustomersClient() {
  const router = useRouter();
  const { success, error: showError } = useToast();

  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [status, setStatus] = useState("");
  const [verified, setVerified] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [minOrders, setMinOrders] = useState("");
  const [maxOrders, setMaxOrders] = useState("");
  const [minSpend, setMinSpend] = useState("");
  const [maxSpend, setMaxSpend] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 20;

  useEffect(() => {
    setLoading(true);
    const q = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    if (deferredSearch) q.set("search", deferredSearch);
    if (status) q.set("status", status);
    if (verified) q.set("verified", verified);
    if (dateFrom) q.set("dateFrom", dateFrom);
    if (dateTo) q.set("dateTo", dateTo);
    if (minOrders) q.set("minOrders", minOrders);
    if (maxOrders) q.set("maxOrders", maxOrders);
    if (minSpend) q.set("minSpend", minSpend);
    if (maxSpend) q.set("maxSpend", maxSpend);
    fetch(`/api/admin/customers?${q}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setCustomers(d.data);
          setTotal(d.pagination.total);
        }
      })
      .finally(() => setLoading(false));
  }, [deferredSearch, status, verified, dateFrom, dateTo, minOrders, maxOrders, minSpend, maxSpend, page]);

  async function setCustomerActive(id: string, isActive: boolean) {
    const res = await fetch(`/api/admin/customers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    });
    const data = await res.json();
    if (!data.success) {
      showError(data.error ?? "Customer update failed");
      return;
    }
    setCustomers((rows) => rows.map((row) => row.id === id ? { ...row, isActive } : row));
    success(isActive ? "Customer reactivated" : "Customer deactivated");
  }

  const pages = Math.ceil(total / LIMIT);
  const filterFields: DataTableFilterField[] = [
    { key: "status", label: "Status", type: "select", value: status, options: STATUS_FILTERS, onChange: (value) => { setStatus(value); setPage(1); } },
    { key: "verified", label: "Email", type: "select", value: verified, options: VERIFIED_FILTERS, onChange: (value) => { setVerified(value); setPage(1); } },
    { key: "dateFrom", label: "Joined From", type: "date", value: dateFrom, onChange: (value) => { setDateFrom(value); setPage(1); } },
    { key: "dateTo", label: "Joined To", type: "date", value: dateTo, onChange: (value) => { setDateTo(value); setPage(1); } },
    { key: "minOrders", label: "Min Orders", type: "number", min: 0, step: 1, value: minOrders, onChange: (value) => { setMinOrders(value); setPage(1); } },
    { key: "maxOrders", label: "Max Orders", type: "number", min: 0, step: 1, value: maxOrders, onChange: (value) => { setMaxOrders(value); setPage(1); } },
    { key: "minSpend", label: "Min Spend (₹)", type: "number", min: 0, step: 1, value: minSpend, onChange: (value) => { setMinSpend(value); setPage(1); } },
    { key: "maxSpend", label: "Max Spend (₹)", type: "number", min: 0, step: 1, value: maxSpend, onChange: (value) => { setMaxSpend(value); setPage(1); } },
  ];

  function resetFilters() {
    setSearch("");
    setStatus("");
    setVerified("");
    setDateFrom("");
    setDateTo("");
    setMinOrders("");
    setMaxOrders("");
    setMinSpend("");
    setMaxSpend("");
    setPage(1);
  }

  return (
    <div className={styles.content}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className="admin-page-title">Customers</h1>
          <p className="admin-page-subtitle">{total} customer{total !== 1 ? "s" : ""} total</p>
        </div>
      </div>

      <DataTableFilters
        title="Customer filters"
        subtitle="Filter customers by identity, status, join date, order count, and lifetime spend."
        searchValue={search}
        searchPlaceholder="Search name, email, or phone..."
        onSearchChange={(value) => { setSearch(value); setPage(1); }}
        fields={filterFields}
        onReset={resetFilters}
        resultLabel={`${total} result${total !== 1 ? "s" : ""}`}
      />

      {loading ? (
        <div className={styles.loadingWrap}><Spinner size="lg" /></div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Phone</th>
                <th>Orders</th>
                <th>Spend</th>
                <th>Last Order</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 ? (
                <tr><td colSpan={7} className={styles.empty}>No customers found</td></tr>
              ) : customers.map((customer) => {
                const name = `${customer.firstName} ${customer.lastName ?? ""}`.trim();
                return (
                  <tr key={customer.id} onClick={() => router.push(`/admin/customers/${customer.id}`)} className={styles.clickRow}>
                    <td>
                      <div className={styles.customerCell}>
                        <div className={styles.avatar}>{name.charAt(0).toUpperCase()}</div>
                        <div>
                          <Link href={`/admin/customers/${customer.id}`} className={styles.customerName} onClick={(e) => e.stopPropagation()}>
                            {name}
                          </Link>
                          <p className={styles.email}>{customer.email}</p>
                        </div>
                      </div>
                    </td>
                    <td>{customer.phone ? <a href={`tel:${customer.phone}`} className={styles.phone} onClick={(e) => e.stopPropagation()}>{customer.phone}</a> : "—"}</td>
                    <td><span className={styles.metricStrong}>{customer.orderCount}</span></td>
                    <td>₹{(customer.totalSpendInr / 100).toLocaleString("en-IN")}</td>
                    <td>{customer.lastOrderAt ? new Date(customer.lastOrderAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}</td>
                    <td>
                      <Badge variant={customer.isActive ? "success" : "danger"}>{customer.isActive ? "Active" : "Inactive"}</Badge>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <Link href={`/admin/customers/${customer.id}`} className={styles.viewLink} onClick={(e) => e.stopPropagation()}>View</Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (!confirm(`Impersonate ${customer.email}? Your admin session will be paused.`)) return;
                            const res = await fetch(`/api/admin/customers/${customer.id}/impersonate`, { method: "POST" });
                            const data = await res.json();
                            if (data.success) { window.location.href = "/"; }
                          }}
                          title="Login as this customer"
                        >
                          🎭 Impersonate
                        </Button>
                        <Button
                          variant={customer.isActive ? "outline" : "secondary"}
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCustomerActive(customer.id, !customer.isActive);
                          }}
                        >
                          {customer.isActive ? "Deactivate" : "Reactivate"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className={styles.pagination}>
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className={styles.pageBtn}>Prev</button>
          <span className={styles.pageInfo}>Page {page} of {pages}</span>
          <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages} className={styles.pageBtn}>Next</button>
        </div>
      )}
    </div>
  );
}
