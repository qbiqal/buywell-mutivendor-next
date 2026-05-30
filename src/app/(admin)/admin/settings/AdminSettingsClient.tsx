"use client";
import React, { useEffect, useState } from "react";
import { Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardBody, CardFooter } from "@/components/ui/Card";
import { MediaUploader } from "@/components/media/MediaUploader";
import { useToast } from "@/components/ui/Toast";
import type { UploadedFile } from "@/components/media/MediaUploader";
import styles from "./settings.module.css";

export default function AdminSettingsClient() {
  const { success, error: showError } = useToast();
  const [config, setConfig] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/config")
      .then((r) => r.json())
      .then((d) => { if (d.success) setConfig(d.data); })
      .finally(() => setLoading(false));
  }, []);

  function set(key: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setConfig((p) => ({ ...p, [key]: e.target.value }));
  }

  async function save(keys: string[]) {
    setSaving(true);
    try {
      const entries = Object.fromEntries(keys.map((k) => [k, config[k] ?? ""]));
      const res  = await fetch("/api/admin/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entries),
      });
      const data = await res.json();
      if (data.success) success("Settings saved!");
      else showError("Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className={styles.content}>Loading...</div>;

  return (
    <div className={styles.content}>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Settings</h1>
        <p className="admin-page-subtitle">Configure site information, payment, and shipping</p>
      </div>

      {/* Site Info */}
      <Card padding="none" className={styles.settingsCard}>
        <CardHeader><h2 className={styles.sectionTitle}>Site Information</h2></CardHeader>
        <CardBody className={styles.cardFields}>
          <Input label="Site Name"    value={config.site_name    ?? ""} onChange={set("site_name")}    placeholder="APRAS Naturals" />
          <Input label="Site Tagline" value={config.site_tagline ?? ""} onChange={set("site_tagline")} placeholder="Pure Honey & Ghee" />
          <Input label="Email"        value={config.site_email   ?? ""} onChange={set("site_email")}   placeholder="aprasnaturals@gmail.com" type="email" />
          <Input label="Phone / WhatsApp" value={config.site_phone ?? ""} onChange={set("site_phone")} placeholder="+91 9470309006" />
          <Textarea label="Address" value={config.site_address ?? ""} onChange={set("site_address")} placeholder="Ranchi – 834005, Jharkhand" />
        </CardBody>
        <CardFooter>
          <Button variant="primary" loading={saving} onClick={() => save(["site_name","site_tagline","site_email","site_phone","site_address"])}>
            Save Site Info
          </Button>
        </CardFooter>
      </Card>

      {/* Payment Settings */}
      <Card padding="none" className={styles.settingsCard}>
        <CardHeader><h2 className={styles.sectionTitle}>Payment — QR Code Setup</h2></CardHeader>
        <CardBody className={styles.cardFields}>
          <div>
            <p className={styles.fieldLabel}>QR Code Image</p>
            <p className={styles.fieldHint}>This QR code is shown to customers on the payment page. Recommended: 800×800px (1:1)</p>
            {config.payment_qr_url && (
              <div className={styles.qrPreview}>
                <img src={config.payment_qr_url} alt="Current QR" style={{ width: 120, height: 120, objectFit: "contain" }} />
                <p className={styles.qrUrl}>{config.payment_qr_url}</p>
              </div>
            )}
            <MediaUploader
              accept={["image/jpeg","image/png"]}
              aspectRatio={1}
              recommendedDimensions={{ width: 800, height: 800, label: "QR Code: 800×800px (1:1 square)" }}
              folder="payment"
              onUpload={(files: UploadedFile[]) => { if (files[0]) setConfig((p) => ({ ...p, payment_qr_url: files[0].url })); }}
            />
          </div>
          <Input label="UPI ID" value={config.payment_upi_id ?? ""} onChange={set("payment_upi_id")} placeholder="aprasnaturals@upi" />
          <Input label="Company Name (shown on payment page)" value={config.payment_company_name ?? ""} onChange={set("payment_company_name")} placeholder="APRAS Naturals" />
        </CardBody>
        <CardFooter>
          <Button variant="primary" loading={saving} onClick={() => save(["payment_qr_url","payment_upi_id","payment_company_name"])}>
            Save Payment Settings
          </Button>
        </CardFooter>
      </Card>

      {/* Shipping Settings */}
      <Card padding="none" className={styles.settingsCard}>
        <CardHeader><h2 className={styles.sectionTitle}>Shipping</h2></CardHeader>
        <CardBody className={styles.cardFields}>
          <Input label="Free Shipping Above (₹)" value={String(parseInt(config.shipping_free_above ?? "99900") / 100)} onChange={(e) => setConfig((p) => ({ ...p, shipping_free_above: String(parseInt(e.target.value) * 100) }))} type="number" placeholder="999" />
          <Input label="Flat Shipping Rate (₹)" value={String(parseInt(config.shipping_flat_rate ?? "6000") / 100)} onChange={(e) => setConfig((p) => ({ ...p, shipping_flat_rate: String(parseInt(e.target.value) * 100) }))} type="number" placeholder="60" />
        </CardBody>
        <CardFooter>
          <Button variant="primary" loading={saving} onClick={() => save(["shipping_free_above","shipping_flat_rate"])}>
            Save Shipping
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
