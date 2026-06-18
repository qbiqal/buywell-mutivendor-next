"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import styles from "./admin-analytics.module.css";

interface AnalyticsData {
  range: {
    days: number;
    since: string;
    until: string | null;
    dateFrom: string | null;
    dateTo: string | null;
    vendorId: number | null;
    productName: string | null;
  };
  summary: {
    totalOrders: number;
    verifiedRevenueInr: number;
    pendingVerification: number;
    sampleRequests: number;
    averageOrderInr: number;
  };
  revenueByDay: Array<{ date: string; orderCount: number; revenueInr: number }>;
  ordersByStatus: Array<{ status: string; count: number }>;
  paymentsByStatus: Array<{ status: string; count: number }>;
  topProducts: Array<{ productName: string; quantity: number; revenueInr: number }>;
  customerGrowth: Array<{ date: string; count: number }>;
  traffic: {
    pageViews: number;
    uniqueVisitors: number;
    sessions: number;
    topPages: Array<{ path: string; views: number; visitors: number }>;
    referrers: Array<{ referrer: string; views: number }>;
    sources: Array<{ source: string; views: number }>;
  };
  vendorBreakdown: Array<{
    vendorId: number;
    storeName: string;
    orderCount: number;
    revenueInr: number;
    commissionAmount: number;
  }>;
}

interface VendorOption { id: number; storeName: string; }

const PRESETS = [
  { days: 1,  label: "Today" },
  { days: 7,  label: "7D" },
  { days: 30, label: "30D" },
  { days: 90, label: "90D" },
];

export default function AdminAnalyticsClient() {
  const [days,         setDays]         = useState(30);
  const [customRange,  setCustomRange]  = useState(false);
  const [dateFrom,     setDateFrom]     = useState("");
  const [dateTo,       setDateTo]       = useState("");
  const [vendorId,     setVendorId]     = useState("");
  const [productName,  setProductName]  = useState("");
  const [vendors,      setVendors]      = useState<VendorOption[]>([]);
  const [data,         setData]         = useState<AnalyticsData | null>(null);
  const [loading,      setLoading]      = useState(true);

  // Load vendors for filter dropdown
  useEffect(() => {
    fetch("/api/admin/vendors?status=approved&limit=200")
      .then((r) => r.json())
      .then((d) => { if (d.success) setVendors(d.vendors); })
      .catch(() => {});
  }, []);

  // Load analytics
  useEffect(() => {
    setLoading(true);
    const q = new URLSearchParams();
    if (customRange && dateFrom) { q.set("dateFrom", dateFrom); }
    if (customRange && dateTo)   { q.set("dateTo", dateTo); }
    if (!customRange)             { q.set("days", String(days)); }
    if (vendorId)    q.set("vendorId", vendorId);
    if (productName) q.set("productName", productName);

    fetch(`/api/admin/analytics?${q}`)
      .then((res) => res.json())
      .then((json) => { if (json.success) setData(json.data); })
      .finally(() => setLoading(false));
  }, [days, customRange, dateFrom, dateTo, vendorId, productName]);

  const maxRevenue = useMemo(() =>
    Math.max(1, ...(data?.revenueByDay.map((r) => r.revenueInr) ?? [1])),
  [data]);

  const maxCustomers = useMemo(() =>
    Math.max(1, ...(data?.customerGrowth.map((r) => r.count) ?? [1])),
  [data]);

  const exportParams = useMemo(() => {
    const q = new URLSearchParams();
    if (customRange && dateFrom) q.set("dateFrom", dateFrom);
    if (customRange && dateTo)   q.set("dateTo", dateTo);
    if (!customRange)             q.set("days", String(days));
    if (vendorId)    q.set("vendorId", vendorId);
    if (productName) q.set("productName", productName);
    q.set("format", "csv");
    return q.toString();
  }, [days, customRange, dateFrom, dateTo, vendorId, productName]);

  if (loading) return <div className={styles.loadingWrap}><Spinner size="lg" /></div>;
  if (!data) return <div className={styles.content}>Analytics unavailable.</div>;

  const maxStatus = Math.max(1, ...data.ordersByStatus.map((r) => r.count), ...data.paymentsByStatus.map((r) => r.count));
  const rangeLabel = customRange
    ? `${dateFrom || "—"} → ${dateTo || "today"}`
    : (days === 1 ? "Today" : `Last ${days} days`);

  return (
    <div className={styles.content}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className="admin-page-title">Analytics</h1>
          <p className="admin-page-subtitle">{rangeLabel}</p>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.rangeTabs}>
            {PRESETS.map((p) => (
              <button
                key={p.days}
                type="button"
                className={!customRange && days === p.days ? styles.activeRange : ""}
                onClick={() => { setCustomRange(false); setDays(p.days); }}
              >
                {p.label}
              </button>
            ))}
            <button
              type="button"
              className={customRange ? styles.activeRange : ""}
              onClick={() => setCustomRange(true)}
            >
              Custom
            </button>
          </div>
          <a href={`/api/admin/analytics?${exportParams}`} className={styles.exportBtn}>Export CSV</a>
          <button type="button" className={styles.exportBtn} onClick={() => data && exportAnalyticsPdf(data)}>Export PDF</button>
        </div>
      </div>

      {/* Filters row */}
      <div className={styles.filtersRow}>
        {customRange && (
          <>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>From</label>
              <input type="date" className={styles.filterInput} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>To</label>
              <input type="date" className={styles.filterInput} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </>
        )}
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Vendor</label>
          <select className={styles.filterInput} value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
            <option value="">All Vendors</option>
            {vendors.map((v) => (
              <option key={v.id} value={String(v.id)}>{v.storeName}</option>
            ))}
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Product</label>
          <input
            type="text"
            className={styles.filterInput}
            placeholder="Search product name…"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
          />
        </div>
        {(vendorId || productName || customRange) && (
          <button
            type="button"
            className={styles.clearFilters}
            onClick={() => { setVendorId(""); setProductName(""); setCustomRange(false); setDateFrom(""); setDateTo(""); }}
          >
            Clear filters
          </button>
        )}
      </div>

      <div className={styles.statsGrid}>
        <Metric label="Verified Revenue"       value={`₹${formatMoney(data.summary.verifiedRevenueInr)}`}       meta="Paid orders" />
        <Metric label="Orders"                 value={data.summary.totalOrders.toLocaleString("en-IN")}         meta="All statuses" />
        <Metric label="Average Order"          value={`₹${formatMoney(data.summary.averageOrderInr)}`}          meta="Gross average" />
        <Metric label="Pending Verification"   value={data.summary.pendingVerification.toLocaleString("en-IN")} meta="Proof uploaded" urgent={data.summary.pendingVerification > 0} />
        <Metric label="Page Views"             value={data.traffic.pageViews.toLocaleString("en-IN")}           meta="First-party tracking" />
        <Metric label="Visitors"               value={data.traffic.uniqueVisitors.toLocaleString("en-IN")}      meta="Distinct visitor IDs" />
        <Metric label="Sessions"               value={data.traffic.sessions.toLocaleString("en-IN")}            meta="Browser sessions" />
        <Metric label="Sample Requests"        value={data.summary.sampleRequests.toLocaleString("en-IN")}      meta="Order intent" />
      </div>

      <div className={styles.layout}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>Revenue by Day</h2>
            <Badge variant="success">{data.revenueByDay.reduce((s, r) => s + r.orderCount, 0)} orders</Badge>
          </div>
          <div className={styles.barChart}>
            {data.revenueByDay.map((row) => (
              <div key={row.date} className={styles.barCol} title={`${row.date}: ₹${formatMoney(row.revenueInr)}`}>
                <div className={styles.barTrack}>
                  <span className={styles.revenueBar} style={{ height: `${Math.max(2, (row.revenueInr / maxRevenue) * 100)}%` }} />
                </div>
                <span className={styles.axisLabel}>{new Date(row.date).getDate()}</span>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>Customer Growth</h2>
            <Badge variant="info">{data.customerGrowth.reduce((s, r) => s + r.count, 0)} new</Badge>
          </div>
          <div className={styles.barChart}>
            {data.customerGrowth.map((row) => (
              <div key={row.date} className={styles.barCol} title={`${row.date}: ${row.count} customers`}>
                <div className={styles.barTrack}>
                  <span className={styles.customerBar} style={{ height: `${Math.max(2, (row.count / maxCustomers) * 100)}%` }} />
                </div>
                <span className={styles.axisLabel}>{new Date(row.date).getDate()}</span>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}><h2>Order Status</h2></div>
          <StatusBars rows={data.ordersByStatus} max={maxStatus} />
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}><h2>Payment Status</h2></div>
          <StatusBars rows={data.paymentsByStatus} max={maxStatus} />
        </section>

        <section className={[styles.panel, styles.widePanel].join(" ")}>
          <div className={styles.panelHeader}>
            <h2>Top Products</h2>
            <Badge variant="amber">{data.summary.sampleRequests} samples</Badge>
          </div>
          <div className={styles.productTable}>
            {data.topProducts.length === 0 ? (
              <p className={styles.empty}>No product sales yet.</p>
            ) : data.topProducts.map((product, index) => (
              <div key={`${product.productName}-${index}`} className={styles.productRow}>
                <span className={styles.rank}>{index + 1}</span>
                <span className={styles.productName}>{product.productName}</span>
                <span>{product.quantity} sold</span>
                <strong>₹{formatMoney(product.revenueInr)}</strong>
              </div>
            ))}
          </div>
        </section>

        {/* Vendor Breakdown */}
        {data.vendorBreakdown.length > 0 && (
          <section className={[styles.panel, styles.widePanel].join(" ")}>
            <div className={styles.panelHeader}>
              <h2>Vendor Breakdown</h2>
              <Badge variant="info">{data.vendorBreakdown.length} vendors</Badge>
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.vendorTable}>
                <thead>
                  <tr>
                    <th>Vendor</th>
                    <th>Orders</th>
                    <th>Revenue</th>
                    <th>Platform Commission</th>
                    <th>Vendor Earnings</th>
                  </tr>
                </thead>
                <tbody>
                  {data.vendorBreakdown.map((v) => (
                    <tr key={v.vendorId}>
                      <td><a href={`/admin/vendors/${v.vendorId}`} className={styles.vendorLink}>{v.storeName}</a></td>
                      <td>{v.orderCount.toLocaleString("en-IN")}</td>
                      <td>₹{formatMoney(v.revenueInr)}</td>
                      <td>₹{formatMoney(v.commissionAmount)}</td>
                      <td>₹{formatMoney(v.revenueInr - v.commissionAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>Top Pages</h2>
            <Badge variant="info">{data.traffic.pageViews} views</Badge>
          </div>
          <TrafficRows
            rows={data.traffic.topPages.map((r) => ({
              label: r.path, value: `${r.views} views`, meta: `${r.visitors} visitors`,
            }))}
          />
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}><h2>Traffic Sources</h2></div>
          <StatusBars rows={data.traffic.sources.map((r) => ({ status: r.source, count: r.views }))} max={Math.max(1, ...data.traffic.sources.map((r) => r.views))} />
        </section>

        <section className={[styles.panel, styles.widePanel].join(" ")}>
          <div className={styles.panelHeader}><h2>Referrers</h2></div>
          <TrafficRows
            rows={data.traffic.referrers.map((r) => ({
              label: r.referrer,
              value: `${r.views} views`,
              meta: r.referrer === "Direct" ? "Typed, bookmark, or hidden referrer" : "External source",
            }))}
          />
        </section>
      </div>
    </div>
  );
}

function Metric({ label, value, meta, urgent = false }: { label: string; value: string; meta: string; urgent?: boolean }) {
  return (
    <div className={[styles.metric, urgent ? styles.urgentMetric : ""].join(" ")}>
      <p className={styles.metricLabel}>{label}</p>
      <p className={styles.metricValue}>{value}</p>
      <p className={styles.metricMeta}>{meta}</p>
    </div>
  );
}

function StatusBars({ rows, max }: { rows: Array<{ status: string; count: number }>; max: number }) {
  if (rows.length === 0) return <p className={styles.empty}>No data yet.</p>;
  return (
    <div className={styles.statusList}>
      {rows.map((row) => (
        <div key={row.status} className={styles.statusRow}>
          <div className={styles.statusTop}>
            <span>{row.status.replace(/_/g, " ")}</span>
            <strong>{row.count}</strong>
          </div>
          <div className={styles.statusTrack}>
            <span style={{ width: `${Math.max(2, (row.count / max) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function TrafficRows({ rows }: { rows: Array<{ label: string; value: string; meta: string }> }) {
  if (rows.length === 0) return <p className={styles.empty}>No traffic data yet.</p>;
  return (
    <div className={styles.productTable}>
      {rows.map((row, index) => (
        <div key={`${row.label}-${index}`} className={styles.productRow}>
          <span className={styles.rank}>{index + 1}</span>
          <span className={styles.productName}>{row.label}</span>
          <span>{row.meta}</span>
          <strong>{row.value}</strong>
        </div>
      ))}
    </div>
  );
}

function formatMoney(paise: number): string {
  return (paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function exportAnalyticsPdf(data: AnalyticsData) {
  const popup = window.open("", "_blank", "noopener,noreferrer,width=1100,height=800");
  if (!popup) return;
  const rows = [
    ["Verified Revenue", `₹${formatMoney(data.summary.verifiedRevenueInr)}`],
    ["Orders", String(data.summary.totalOrders)],
    ["Average Order", `₹${formatMoney(data.summary.averageOrderInr)}`],
    ["Pending Verification", String(data.summary.pendingVerification)],
    ["Page Views", String(data.traffic.pageViews)],
    ["Visitors", String(data.traffic.uniqueVisitors)],
    ["Sessions", String(data.traffic.sessions)],
  ];
  popup.document.write(`<!doctype html><html><head><title>BuyWell Analytics</title><style>
    body{font-family:Arial,sans-serif;margin:24px;color:#111827}
    h1{font-size:20px;margin:0 0 8px} p{margin:0 0 18px;color:#4b5563}
    table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px}
    th,td{border:1px solid #d1d5db;padding:8px;text-align:left}
    th{background:#f3f4f6}
  </style></head><body><h1>BuyWell Analytics</h1><p>${data.range.days === 1 ? "Today" : `Last ${data.range.days} days`}</p><table><tbody>${rows.map(([key, value]) => `<tr><th>${key}</th><td>${value}</td></tr>`).join("")}</tbody></table><h2>Top Products</h2><table><thead><tr><th>Product</th><th>Quantity</th><th>Revenue</th></tr></thead><tbody>${data.topProducts.map((row) => `<tr><td>${escapeHtml(row.productName)}</td><td>${row.quantity}</td><td>₹${formatMoney(row.revenueInr)}</td></tr>`).join("")}</tbody></table><script>window.print();</script></body></html>`);
  popup.document.close();
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" }[char] ?? char));
}
