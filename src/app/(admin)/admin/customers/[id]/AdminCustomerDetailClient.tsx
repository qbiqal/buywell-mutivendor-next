"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import styles from "./admin-customer-detail.module.css";

interface CustomerDetail {
  customer: {
    id: string;
    email: string;
    firstName: string;
    lastName: string | null;
    phone: string | null;
    isActive: boolean;
    emailVerified: boolean;
    avatarUrl: string | null;
    createdAt: string;
    updatedAt: string;
  };
  addresses: Array<{
    id: string;
    label: string | null;
    name: string;
    phone: string;
    line1: string;
    line2: string | null;
    city: string;
    state: string;
    pincode: string;
    isDefault: boolean;
  }>;
  orders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    paymentStatus: string;
    totalInr: number;
    isSampleRequest: boolean;
    createdAt: string;
  }>;
  stats: {
    orderCount: number;
    totalSpendInr: number;
    lastOrderAt: string | null;
  };
}

export default function AdminCustomerDetailClient() {
  const params = useParams();
  const router = useRouter();
  const { success, error: showError } = useToast();
  const id = params.id as string;

  const [data, setData] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/customers/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setData(d.data);
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function setCustomerActive(isActive: boolean) {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/customers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      const result = await res.json();
      if (!result.success) {
        showError(result.error ?? "Customer update failed");
        return;
      }
      setData((current) => current
        ? { ...current, customer: { ...current.customer, isActive } }
        : current);
      success(isActive ? "Customer reactivated" : "Customer deactivated");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className={styles.loadingWrap}><Spinner size="lg" /></div>;
  if (!data) return <div className={styles.content}>Customer not found.</div>;

  const customer = data.customer;
  const name = `${customer.firstName} ${customer.lastName ?? ""}`.trim();

  return (
    <div className={styles.content}>
      <button onClick={() => router.back()} className={styles.backBtn}>Back to Customers</button>

      <div className={styles.header}>
        <div className={styles.identity}>
          <div className={styles.avatar}>{name.charAt(0).toUpperCase()}</div>
          <div>
            <h1 className={styles.title}>{name}</h1>
            <p className={styles.meta}>Customer since {new Date(customer.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
          </div>
        </div>
        <div className={styles.headerActions}>
          <Badge variant={customer.isActive ? "success" : "danger"}>{customer.isActive ? "Active" : "Inactive"}</Badge>
          <Button
            variant={customer.isActive ? "outline" : "secondary"}
            loading={saving}
            onClick={() => setCustomerActive(!customer.isActive)}
          >
            {customer.isActive ? "Deactivate" : "Reactivate"}
          </Button>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Orders</p>
          <p className={styles.statValue}>{data.stats.orderCount}</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Total Spend</p>
          <p className={styles.statValue}>₹{(data.stats.totalSpendInr / 100).toLocaleString("en-IN")}</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Last Order</p>
          <p className={styles.statValueSmall}>{data.stats.lastOrderAt ? new Date(data.stats.lastOrderAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "No orders"}</p>
        </div>
      </div>

      <div className={styles.layout}>
        <div className={styles.mainColumn}>
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Recent Orders</h2>
              <Link href={`/admin/orders?search=${encodeURIComponent(customer.email)}`} className={styles.link}>Search Orders</Link>
            </div>
            {data.orders.length === 0 ? (
              <p className={styles.empty}>No orders yet.</p>
            ) : (
              <div className={styles.orderList}>
                {data.orders.map((order) => (
                  <Link key={order.id} href={`/admin/orders/${order.id}`} className={styles.orderRow}>
                    <div>
                      <p className={styles.orderNumber}>{order.orderNumber}</p>
                      <p className={styles.orderMeta}>{new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                    </div>
                    <div className={styles.orderBadges}>
                      <Badge statusKey={order.paymentStatus}>{order.paymentStatus.replace(/_/g, " ")}</Badge>
                      <Badge statusKey={order.status}>{order.status.replace(/_/g, " ")}</Badge>
                    </div>
                    <p className={styles.orderAmount}>₹{(order.totalInr / 100).toLocaleString("en-IN")}</p>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Addresses</h2>
              <span className={styles.count}>{data.addresses.length}</span>
            </div>
            {data.addresses.length === 0 ? (
              <p className={styles.empty}>No saved addresses.</p>
            ) : (
              <div className={styles.addressGrid}>
                {data.addresses.map((address) => (
                  <address key={address.id} className={styles.addressCard}>
                    <div className={styles.addressTop}>
                      <strong>{address.label ?? "Address"}</strong>
                      {address.isDefault && <Badge variant="info">Default</Badge>}
                    </div>
                    <p>{address.name}</p>
                    <p>{address.phone}</p>
                    <p>{address.line1}{address.line2 ? `, ${address.line2}` : ""}</p>
                    <p>{address.city}, {address.state} {address.pincode}</p>
                  </address>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className={styles.sideColumn}>
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Contact</h2>
            <div className={styles.infoRows}>
              <div className={styles.infoRow}><span>Email</span><a href={`mailto:${customer.email}`}>{customer.email}</a></div>
              <div className={styles.infoRow}><span>Phone</span>{customer.phone ? <a href={`tel:${customer.phone}`}>{customer.phone}</a> : <strong>-</strong>}</div>
              <div className={styles.infoRow}><span>Email Verified</span><strong>{customer.emailVerified ? "Yes" : "No"}</strong></div>
            </div>
            {customer.phone && (
              <a
                href={`https://wa.me/${customer.phone.replace(/[^0-9]/g, "")}?text=Hi ${encodeURIComponent(name)},`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.whatsappBtn}
              >
                Message on WhatsApp
              </a>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
