"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import styles from "./notification-wallets.module.css";

type WalletChannel = "whatsapp" | "email" | "sms";

interface Wallet {
  id: string;
  channel: WalletChannel;
  balanceCredits: number;
  lowBalanceThreshold: number;
  isEnabled: boolean;
  updatedAt: string;
}

interface WalletTransaction {
  id: string;
  channel: WalletChannel;
  type: "credit" | "debit" | "reversal" | "adjustment";
  credits: number;
  balanceAfter: number;
  reason: string | null;
  referenceType: string | null;
  referenceId: string | null;
  createdAt: string;
}

interface WalletData {
  wallets: Wallet[];
  transactions: WalletTransaction[];
  canCredit: boolean;
}

const CHANNEL_LABELS: Record<WalletChannel, string> = {
  whatsapp: "WhatsApp",
  email: "Email",
  sms: "SMS",
};

export default function NotificationWalletsClient() {
  const { success, error: showError } = useToast();
  const [data, setData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ channel: "whatsapp" as WalletChannel, credits: "100", reason: "" });

  useEffect(() => {
    loadWallets();
  }, []);

  function loadWallets() {
    setLoading(true);
    fetch("/api/admin/notification-wallets")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setData(json.data);
        else showError(json.error ?? "Unable to load notification wallets");
      })
      .finally(() => setLoading(false));
  }

  const selectedWallet = useMemo(
    () => data?.wallets.find((wallet) => wallet.channel === form.channel),
    [data, form.channel],
  );

  async function creditWallet(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const credits = Number(form.credits);
    if (!Number.isFinite(credits) || credits <= 0) {
      showError("Credits must be greater than zero");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/notification-wallets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: form.channel,
          credits,
          reason: form.reason,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        showError(json.error ?? "Wallet credit failed");
        return;
      }
      success(`${CHANNEL_LABELS[form.channel]} wallet credited`);
      setForm((current) => ({ ...current, reason: "" }));
      loadWallets();
    } finally {
      setSaving(false);
    }
  }

  if (loading && !data) return <div className={styles.loadingWrap}><Spinner size="lg" /></div>;
  if (!data) return <div className={styles.content}>Notification wallet data unavailable.</div>;

  return (
    <div className={styles.content}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className="admin-page-title">Notification Wallets</h1>
          <p className="admin-page-subtitle">Qbiqal credit controls for WhatsApp, email, and SMS notification sends.</p>
        </div>
        <Badge variant={data.canCredit ? "success" : "warning"}>{data.canCredit ? "Qbiqal access" : "Read only"}</Badge>
      </div>

      <div className={styles.walletGrid}>
        {data.wallets.map((wallet) => {
          const low = wallet.balanceCredits <= wallet.lowBalanceThreshold;
          return (
            <section key={wallet.id} className={styles.walletCard}>
              <div>
                <span className={styles.walletLabel}>{CHANNEL_LABELS[wallet.channel]}</span>
                <strong>{wallet.balanceCredits.toLocaleString("en-IN")}</strong>
                <small>credits available</small>
              </div>
              <Badge variant={!wallet.isEnabled ? "danger" : low ? "warning" : "success"}>
                {!wallet.isEnabled ? "Disabled" : low ? "Low balance" : "Ready"}
              </Badge>
            </section>
          );
        })}
      </div>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <h2>Credit Wallet</h2>
            <p>Each successful channel notification consumes one credit from its matching wallet.</p>
          </div>
          {selectedWallet && <Badge variant="default">{selectedWallet.balanceCredits} current credits</Badge>}
        </div>
        <form className={styles.creditForm} onSubmit={creditWallet}>
          <Select
            label="Channel"
            value={form.channel}
            onChange={(e) => setForm((current) => ({ ...current, channel: e.target.value as WalletChannel }))}
            options={[
              { value: "whatsapp", label: "WhatsApp" },
              { value: "email", label: "Email" },
              { value: "sms", label: "SMS" },
            ]}
          />
          <Input
            label="Credits"
            type="number"
            min="1"
            value={form.credits}
            onChange={(e) => setForm((current) => ({ ...current, credits: e.target.value }))}
          />
          <Input
            label="Reason"
            value={form.reason}
            onChange={(e) => setForm((current) => ({ ...current, reason: e.target.value }))}
            placeholder="Recharge note or invoice reference"
          />
          <Button type="submit" variant="primary" loading={saving} disabled={!data.canCredit}>
            Add Credits
          </Button>
        </form>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <h2>Wallet Ledger</h2>
            <p>Latest credit, debit, and reversal transactions.</p>
          </div>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Time</th>
                <th>Channel</th>
                <th>Type</th>
                <th>Credits</th>
                <th>Balance</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {data.transactions.length === 0 ? (
                <tr><td colSpan={6} className={styles.empty}>No wallet transactions yet.</td></tr>
              ) : data.transactions.map((tx) => (
                <tr key={tx.id}>
                  <td>{new Date(tx.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</td>
                  <td>{CHANNEL_LABELS[tx.channel]}</td>
                  <td><Badge variant={tx.type === "debit" ? "warning" : tx.type === "reversal" ? "default" : "success"}>{tx.type}</Badge></td>
                  <td>{tx.type === "debit" ? "-" : "+"}{tx.credits}</td>
                  <td>{tx.balanceAfter}</td>
                  <td>
                    <strong>{tx.reason ?? "-"}</strong>
                    {tx.referenceType && <span>{tx.referenceType}: {tx.referenceId ?? "-"}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
