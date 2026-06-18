"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { formatDateTime } from "@/lib/utils";
import styles from "./gst-report.module.css";

interface Summary {
  totalOrders: number;
  taxableValueInr: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalTax: number;
}

interface ByTaxRate {
  taxRateName: string;
  totalRate: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  orderCount: number;
}

interface OrderRow {
  orderNumber: string;
  orderId: string;
  createdAt: string;
  buyerName: string;
  totalInr: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  taxRateName: string;
  hsnCode: string | null;
  storeName: string | null;
}

function inr(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const today = new Date().toISOString().slice(0, 10);
const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

export default function GstReportClient() {
  const { error: showError } = useToast();
  const [dateFrom,    setDateFrom]    = useState(firstOfMonth);
  const [dateTo,      setDateTo]      = useState(today);
  const [vendorId,    setVendorId]    = useState("");
  const [vendors,     setVendors]     = useState<Array<{ id: number; storeName: string }>>([]);
  const [loading,     setLoading]     = useState(false);
  const [summary,     setSummary]     = useState<Summary | null>(null);
  const [byTaxRate,   setByTaxRate]   = useState<ByTaxRate[]>([]);
  const [orderList,   setOrderList]   = useState<OrderRow[]>([]);

  useEffect(() => {
    fetch("/api/admin/vendors?status=approved&limit=200")
      .then(r => r.json())
      .then(d => { if (d.success) setVendors(d.vendors ?? []); });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ from: dateFrom, to: dateTo });
      if (vendorId) q.set("vendorId", vendorId);
      const res = await fetch(`/api/admin/gst/report?${q}`);
      const d   = await res.json();
      if (!d.success) { showError(d.error ?? "Failed to load GST report"); return; }
      setSummary(d.summary);
      setByTaxRate(d.byTaxRate);
      setOrderList(d.orders);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, vendorId, showError]);

  useEffect(() => { load(); }, [load]);

  function exportCsv() {
    const rows = [
      ["Order", "Date", "Buyer", "Vendor", "HSN", "GST Rate", "Taxable Value", "CGST", "SGST", "IGST", "Total Tax"],
      ...orderList.map(o => [
        o.orderNumber,
        new Date(o.createdAt).toLocaleDateString("en-IN"),
        o.buyerName,
        o.storeName ?? "—",
        o.hsnCode ?? "—",
        o.taxRateName,
        (o.taxableValue / 100).toFixed(2),
        (o.cgst / 100).toFixed(2),
        (o.sgst / 100).toFixed(2),
        (o.igst / 100).toFixed(2),
        (o.totalTax / 100).toFixed(2),
      ]),
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `gst-report-${dateFrom}-to-${dateTo}.csv`;
    a.click();
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>GST Report</h1>
          <p className={styles.subtitle}>Indian GST compliance report — verified orders only</p>
        </div>
        <button className={styles.exportBtn} onClick={exportCsv} disabled={orderList.length === 0}>
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>From</label>
          <input type="date" className={styles.filterInput} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        </div>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>To</label>
          <input type="date" className={styles.filterInput} value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Vendor</label>
          <select className={styles.filterInput} value={vendorId} onChange={e => setVendorId(e.target.value)}>
            <option value="">All Vendors</option>
            {vendors.map(v => <option key={v.id} value={v.id}>{v.storeName}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className={styles.loadingWrap}><Spinner size="lg" /></div>
      ) : (
        <>
          {/* Summary cards */}
          {summary && (
            <div className={styles.summaryGrid}>
              <div className={styles.summaryCard}>
                <div className={styles.summaryLabel}>Taxable Orders</div>
                <div className={styles.summaryValue}>{summary.totalOrders}</div>
              </div>
              <div className={styles.summaryCard}>
                <div className={styles.summaryLabel}>Taxable Value</div>
                <div className={styles.summaryValue}>{inr(summary.taxableValueInr)}</div>
              </div>
              <div className={styles.summaryCard}>
                <div className={styles.summaryLabel}>CGST Collected</div>
                <div className={styles.summaryValue}>{inr(summary.totalCgst)}</div>
              </div>
              <div className={styles.summaryCard}>
                <div className={styles.summaryLabel}>SGST Collected</div>
                <div className={styles.summaryValue}>{inr(summary.totalSgst)}</div>
              </div>
              <div className={styles.summaryCard}>
                <div className={styles.summaryLabel}>IGST Collected</div>
                <div className={styles.summaryValue}>{inr(summary.totalIgst)}</div>
              </div>
              <div className={`${styles.summaryCard} ${styles.totalCard}`}>
                <div className={styles.summaryLabel}>Total Tax</div>
                <div className={styles.summaryValue}>{inr(summary.totalTax)}</div>
              </div>
            </div>
          )}

          {/* By tax rate breakdown */}
          {byTaxRate.length > 0 && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>By GST Rate</h2>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>GST Rate</th>
                      <th>Orders</th>
                      <th>Taxable Value</th>
                      <th>CGST</th>
                      <th>SGST</th>
                      <th>IGST</th>
                      <th>Total Tax</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byTaxRate.map((r, i) => (
                      <tr key={i}>
                        <td><strong>{r.taxRateName}</strong></td>
                        <td>{r.orderCount}</td>
                        <td>{inr(r.taxableValue)}</td>
                        <td>{inr(r.cgst)}</td>
                        <td>{inr(r.sgst)}</td>
                        <td>{inr(r.igst)}</td>
                        <td><strong>{inr(r.totalTax)}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Orders table */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Order Detail</h2>
            {orderList.length === 0 ? (
              <p className={styles.empty}>No GST-applicable orders found for this period. Make sure products have HSN codes and tax rates assigned.</p>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Date &amp; Time</th>
                      <th>Buyer</th>
                      <th>Vendor</th>
                      <th>HSN</th>
                      <th>GST Rate</th>
                      <th>Taxable Value</th>
                      <th>CGST</th>
                      <th>SGST</th>
                      <th>IGST</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderList.map(o => (
                      <tr key={o.orderId}>
                        <td>
                          <Link href={`/admin/orders/${o.orderId}`} className={styles.orderLink}>
                            {o.orderNumber}
                          </Link>
                        </td>
                        <td className={styles.dateCell}>{formatDateTime(o.createdAt)}</td>
                        <td>{o.buyerName}</td>
                        <td>{o.storeName ?? "—"}</td>
                        <td><code className={styles.hsn}>{o.hsnCode ?? "—"}</code></td>
                        <td>{o.taxRateName}</td>
                        <td>{inr(o.taxableValue)}</td>
                        <td>{inr(o.cgst)}</td>
                        <td>{inr(o.sgst)}</td>
                        <td>{inr(o.igst)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {orderList.length > 0 && (
            <p className={styles.disclaimer}>
              ⚠️ This report is for reference only. Tax values are back-calculated approximations based on product tax rates. Actual GST returns must be filed by a qualified CA using GSTN portal data.
            </p>
          )}
        </>
      )}
    </div>
  );
}
