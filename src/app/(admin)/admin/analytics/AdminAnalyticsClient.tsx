"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import styles from "./admin-analytics.module.css";

interface AnalyticsData {
  range: { days: number; since: string };
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
}

const RANGES = [7, 30, 90];

export default function AdminAnalyticsClient() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/analytics?days=${days}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setData(json.data);
      })
      .finally(() => setLoading(false));
  }, [days]);

  const maxRevenue = useMemo(() => {
    return Math.max(1, ...(data?.revenueByDay.map((row) => row.revenueInr) ?? [1]));
  }, [data]);

  const maxCustomers = useMemo(() => {
    return Math.max(1, ...(data?.customerGrowth.map((row) => row.count) ?? [1]));
  }, [data]);

  if (loading) return <div className={styles.loadingWrap}><Spinner size="lg" /></div>;
  if (!data) return <div className={styles.content}>Analytics unavailable.</div>;

  const maxStatus = Math.max(1, ...data.ordersByStatus.map((row) => row.count), ...data.paymentsByStatus.map((row) => row.count));

  return (
    <div className={styles.content}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className="admin-page-title">Analytics</h1>
          <p className="admin-page-subtitle">Last {data.range.days} days</p>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.rangeTabs}>
            {RANGES.map((range) => (
              <button
                key={range}
                type="button"
                className={days === range ? styles.activeRange : ""}
                onClick={() => setDays(range)}
              >
                {range}D
              </button>
            ))}
          </div>
          <a href={`/api/admin/analytics?days=${days}&format=csv`} className={styles.exportBtn}>Export CSV</a>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <Metric label="Verified Revenue" value={`₹${formatMoney(data.summary.verifiedRevenueInr)}`} meta="Paid orders" />
        <Metric label="Orders" value={data.summary.totalOrders.toLocaleString("en-IN")} meta="All statuses" />
        <Metric label="Average Order" value={`₹${formatMoney(data.summary.averageOrderInr)}`} meta="Gross average" />
        <Metric label="Pending Verification" value={data.summary.pendingVerification.toLocaleString("en-IN")} meta="Proof uploaded" urgent={data.summary.pendingVerification > 0} />
        <Metric label="Page Views" value={data.traffic.pageViews.toLocaleString("en-IN")} meta="First-party tracking" />
        <Metric label="Visitors" value={data.traffic.uniqueVisitors.toLocaleString("en-IN")} meta="Distinct visitor IDs" />
        <Metric label="Sessions" value={data.traffic.sessions.toLocaleString("en-IN")} meta="Browser sessions" />
        <Metric label="Sample Requests" value={data.summary.sampleRequests.toLocaleString("en-IN")} meta="Order intent" />
      </div>

      <div className={styles.layout}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>Revenue by Day</h2>
            <Badge variant="success">{data.revenueByDay.reduce((sum, row) => sum + row.orderCount, 0)} orders</Badge>
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
            <Badge variant="info">{data.customerGrowth.reduce((sum, row) => sum + row.count, 0)} new</Badge>
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
          <div className={styles.panelHeader}>
            <h2>Order Status</h2>
          </div>
          <StatusBars rows={data.ordersByStatus} max={maxStatus} />
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>Payment Status</h2>
          </div>
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

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>Top Pages</h2>
            <Badge variant="info">{data.traffic.pageViews} views</Badge>
          </div>
          <TrafficRows
            rows={data.traffic.topPages.map((row) => ({
              label: row.path,
              value: `${row.views} views`,
              meta: `${row.visitors} visitors`,
            }))}
          />
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>Traffic Sources</h2>
          </div>
          <StatusBars rows={data.traffic.sources.map((row) => ({ status: row.source, count: row.views }))} max={Math.max(1, ...data.traffic.sources.map((row) => row.views))} />
        </section>

        <section className={[styles.panel, styles.widePanel].join(" ")}>
          <div className={styles.panelHeader}>
            <h2>Referrers</h2>
          </div>
          <TrafficRows
            rows={data.traffic.referrers.map((row) => ({
              label: row.referrer,
              value: `${row.views} views`,
              meta: row.referrer === "Direct" ? "Typed, bookmark, or hidden referrer" : "External source",
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
