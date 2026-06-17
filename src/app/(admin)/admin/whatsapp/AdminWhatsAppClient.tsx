"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import styles from "./admin-whatsapp.module.css";

type TemplateKey = "manual" | "order_confirmed" | "order_shipped" | "payment_rejected" | "admin_new_order";

interface WhatsAppLog {
  id: string;
  orderId: string | null;
  orderNumber: string | null;
  templateKey: string;
  recipientPhone: string;
  recipientName: string | null;
  message: string;
  status: "sent" | "skipped" | "failed";
  providerMessageId: string | null;
  provider: "waha" | "meta";
  walletTransactionId: string | null;
  error: string | null;
  createdAt: string;
}

interface WhatsAppData {
  config: {
    enabled: boolean;
    orderNotify: boolean;
    adminNumber: string;
    provider: "waha" | "meta";
    wahaBaseUrl: string;
    wahaSession: string;
    wahaApiKey: string;
    wahaChatSuffix: string;
    templates: Record<TemplateKey, string>;
  };
  wallet: {
    channel: string;
    balanceCredits: number;
    lowBalanceThreshold: number;
    isEnabled: boolean;
  };
  logs: WhatsAppLog[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

const TEMPLATE_LABELS: Record<TemplateKey, string> = {
  manual: "Manual Message",
  order_confirmed: "Order Confirmed",
  order_shipped: "Order Shipped",
  payment_rejected: "Payment Rejected",
  admin_new_order: "Admin New Order",
};

const TEMPLATE_KEYS = Object.keys(TEMPLATE_LABELS) as TemplateKey[];

export default function AdminWhatsAppClient() {
  const { success, error: showError } = useToast();
  const [data, setData] = useState<WhatsAppData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [page, setPage] = useState(1);
  const [configForm, setConfigForm] = useState({
    enabled: true,
    orderNotify: true,
    adminNumber: "",
    provider: "waha" as "waha" | "meta",
    wahaBaseUrl: "https://whatsapp-gateway.qbiqal.com/",
    wahaSession: "default",
    wahaApiKey: "",
    wahaChatSuffix: "@c.us",
    templates: {} as Record<TemplateKey, string>,
  });
  const [sendForm, setSendForm] = useState({
    phone: "",
    customerName: "",
    message: "",
  });

  useEffect(() => {
    loadWhatsApp();
  }, [page]);

  function loadWhatsApp() {
    setLoading(true);
    fetch(`/api/admin/whatsapp?page=${page}`)
      .then((res) => res.json())
      .then((json) => {
        if (!json.success) return;
        setData(json.data);
        setConfigForm({
          enabled: json.data.config.enabled,
          orderNotify: json.data.config.orderNotify,
          adminNumber: json.data.config.adminNumber,
          provider: json.data.config.provider,
          wahaBaseUrl: json.data.config.wahaBaseUrl,
          wahaSession: json.data.config.wahaSession,
          wahaApiKey: json.data.config.wahaApiKey,
          wahaChatSuffix: json.data.config.wahaChatSuffix,
          templates: json.data.config.templates,
        });
      })
      .finally(() => setLoading(false));
  }

  function setTemplate(key: TemplateKey, value: string) {
    setConfigForm((current) => ({
      ...current,
      templates: { ...current.templates, [key]: value },
    }));
  }

  async function saveSettings() {
    setSaving(true);
    try {
      const payload: Record<string, string> = {
        whatsapp_enabled: configForm.enabled ? "true" : "false",
        whatsapp_order_notify: configForm.orderNotify ? "true" : "false",
        whatsapp_admin_number: configForm.adminNumber,
        whatsapp_provider: configForm.provider,
        whatsapp_waha_base_url: configForm.wahaBaseUrl,
        whatsapp_waha_session: configForm.wahaSession,
        whatsapp_waha_api_key: configForm.wahaApiKey,
        whatsapp_waha_chat_suffix: configForm.wahaChatSuffix,
      };
      for (const key of TEMPLATE_KEYS) {
        payload[`whatsapp_template_${key}`] = configForm.templates[key] ?? "";
      }
      const res = await fetch("/api/admin/whatsapp", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) {
        showError(json.error ?? "Settings save failed");
        return;
      }
      success("WhatsApp settings saved");
      loadWhatsApp();
    } finally {
      setSaving(false);
    }
  }

  async function sendManual() {
    if (!sendForm.phone || !sendForm.message) {
      showError("Phone and message are required");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/admin/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sendForm),
      });
      const json = await res.json();
      if (!json.success) {
        showError(json.error ?? "Send failed");
        return;
      }
      success(json.data.status === "sent" ? "Message sent" : "Message logged");
      setSendForm({ phone: "", customerName: "", message: "" });
      setPage(1);
      loadWhatsApp();
    } finally {
      setSending(false);
    }
  }

  if (loading && !data) return <div className={styles.loadingWrap}><Spinner size="lg" /></div>;
  if (!data) return <div className={styles.content}>WhatsApp data unavailable.</div>;

  return (
    <div className={styles.content}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className="admin-page-title">WhatsApp</h1>
          <p className="admin-page-subtitle">WAHA gateway, manual sends, order templates, wallet-gated delivery logs</p>
        </div>
        <div className={styles.headerBadges}>
          <Badge variant={configForm.enabled ? "success" : "danger"}>{configForm.enabled ? "Enabled" : "Disabled"}</Badge>
          <Badge variant={data.wallet.balanceCredits > 0 && data.wallet.isEnabled ? "success" : "warning"}>
            {data.wallet.balanceCredits} WhatsApp credits
          </Badge>
        </div>
      </div>

      <div className={styles.layout}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}><h2>Manual Send</h2></div>
          <div className={styles.formStack}>
            <Input
              label="Recipient Phone"
              value={sendForm.phone}
              onChange={(e) => setSendForm((current) => ({ ...current, phone: e.target.value }))}
              placeholder="+919999999999"
            />
            <Input
              label="Recipient Name"
              value={sendForm.customerName}
              onChange={(e) => setSendForm((current) => ({ ...current, customerName: e.target.value }))}
              placeholder="Customer"
            />
            <Textarea
              label="Message"
              value={sendForm.message}
              onChange={(e) => setSendForm((current) => ({ ...current, message: e.target.value }))}
              rows={5}
              placeholder="Type the message body..."
            />
            <Button variant="primary" loading={sending} onClick={sendManual}>Send Message</Button>
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}><h2>Settings</h2></div>
          <div className={styles.formStack}>
            <label className={styles.inlineCheck}>
              <input
                type="checkbox"
                checked={configForm.enabled}
                onChange={(e) => setConfigForm((current) => ({ ...current, enabled: e.target.checked }))}
              />
              Enable WhatsApp sending
            </label>
            <label className={styles.inlineCheck}>
              <input
                type="checkbox"
                checked={configForm.orderNotify}
                onChange={(e) => setConfigForm((current) => ({ ...current, orderNotify: e.target.checked }))}
              />
              Enable automatic order notifications
            </label>
            <Input
              label="Admin WhatsApp Number"
              value={configForm.adminNumber}
              onChange={(e) => setConfigForm((current) => ({ ...current, adminNumber: e.target.value }))}
              placeholder="+919999999999"
            />
            <Select
              label="Provider"
              value={configForm.provider}
              onChange={(e) => setConfigForm((current) => ({ ...current, provider: e.target.value as "waha" | "meta" }))}
              options={[
                { value: "waha", label: "WAHA self-hosted gateway" },
                { value: "meta", label: "Meta Cloud API" },
              ]}
            />
            <div className={styles.gatewayGrid}>
              <Input
                label="WAHA Base URL"
                value={configForm.wahaBaseUrl}
                onChange={(e) => setConfigForm((current) => ({ ...current, wahaBaseUrl: e.target.value }))}
                placeholder="https://whatsapp-gateway.qbiqal.com/"
              />
              <Input
                label="WAHA Session"
                value={configForm.wahaSession}
                onChange={(e) => setConfigForm((current) => ({ ...current, wahaSession: e.target.value }))}
                placeholder="default"
              />
            </div>
            <div className={styles.gatewayGrid}>
              <Input
                label="WAHA API Key"
                type="password"
                value={configForm.wahaApiKey}
                onChange={(e) => setConfigForm((current) => ({ ...current, wahaApiKey: e.target.value }))}
                placeholder="X-Api-Key if configured on WAHA"
                autoComplete="off"
              />
              <Input
                label="WAHA Chat Suffix"
                value={configForm.wahaChatSuffix}
                onChange={(e) => setConfigForm((current) => ({ ...current, wahaChatSuffix: e.target.value }))}
                placeholder="@c.us"
              />
            </div>
            <p className={styles.hint}>
              WAHA credentials needed: gateway base URL, session name, optional API key, and the recipient/admin WhatsApp number.
            </p>
            <Button variant="primary" loading={saving} onClick={saveSettings}>Save Settings</Button>
          </div>
        </section>
      </div>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2>Message Templates</h2>
          <p className={styles.hint}>Placeholders use double braces, for example {"{{customerName}}"} and {"{{orderNumber}}"}.</p>
        </div>
        <div className={styles.templateGrid}>
          {TEMPLATE_KEYS.map((key) => (
            <Textarea
              key={key}
              label={TEMPLATE_LABELS[key]}
              value={configForm.templates[key] ?? ""}
              onChange={(e) => setTemplate(key, e.target.value)}
              rows={key === "admin_new_order" ? 6 : 5}
            />
          ))}
        </div>
        <div className={styles.templateFooter}>
          <Button variant="primary" loading={saving} onClick={saveSettings}>Save Templates</Button>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2>Delivery Logs</h2>
          <p className={styles.hint}>{data.pagination.total} total</p>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Recipient</th>
                <th>Template</th>
                <th>Status</th>
                <th>Provider</th>
                <th>Order</th>
                <th>Time</th>
                <th>Error</th>
              </tr>
            </thead>
            <tbody>
              {data.logs.length === 0 ? (
                <tr><td colSpan={7} className={styles.empty}>No WhatsApp logs yet.</td></tr>
              ) : data.logs.map((log) => (
                <tr key={log.id}>
                  <td>
                    <strong>{log.recipientName ?? "Customer"}</strong>
                    <span>{log.recipientPhone}</span>
                  </td>
                  <td>{log.templateKey.replace(/_/g, " ")}</td>
                  <td><Badge variant={log.status === "sent" ? "success" : log.status === "failed" ? "danger" : "warning"}>{log.status}</Badge></td>
                  <td>{log.provider}</td>
                  <td>{log.orderId ? <Link href={`/admin/orders/${log.orderId}`}>{log.orderNumber ?? "Order"}</Link> : "-"}</td>
                  <td>{new Date(log.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                  <td className={styles.errorText}>{log.error ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data.pagination.pages > 1 && (
          <div className={styles.pagination}>
            <button className={styles.pageBtn} disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Prev</button>
            <span>Page {page} of {data.pagination.pages}</span>
            <button className={styles.pageBtn} disabled={page >= data.pagination.pages} onClick={() => setPage((current) => Math.min(data.pagination.pages, current + 1))}>Next</button>
          </div>
        )}
      </section>
    </div>
  );
}
