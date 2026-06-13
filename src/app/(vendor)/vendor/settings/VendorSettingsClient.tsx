"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/Toast";
import { MediaUploader, type UploadedFile } from "@/components/media/MediaUploader";
import styles from "./vendor-settings.module.css";

interface VendorProfile {
  storeName: string;
  storeSlug: string;
  storeDescription: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  gstin: string | null;
  pan: string | null;
  bankAccount: string | null;
  bankIfsc: string | null;
  bankName: string | null;
  accountHolder: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
}

export default function VendorSettingsClient() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<VendorProfile>({
    storeName: "", storeSlug: "", storeDescription: null, logoUrl: null, bannerUrl: null,
    phone: null, email: null, city: null, state: null, pincode: null,
    gstin: null, pan: null, bankAccount: null, bankIfsc: null, bankName: null, accountHolder: null,
    metaTitle: null, metaDescription: null,
  });

  useEffect(() => {
    fetch("/api/vendor/profile")
      .then((r) => r.json())
      .then((d) => { if (d.vendor) setForm(d.vendor); })
      .finally(() => setLoading(false));
  }, []);

  function setField(key: keyof VendorProfile, value: string | null) {
    setForm((f) => ({ ...f, [key]: value || null }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.storeName.trim()) { toast.error("Store name is required."); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/vendor/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Save failed."); return; }
      toast.success("Store settings saved.");
    } catch { toast.error("Network error."); }
    finally { setSaving(false); }
  }

  if (loading) return <div className={styles.loading}>Loading…</div>;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Store Settings</h1>
      <form onSubmit={handleSave} className={styles.form}>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Store Identity</h3>
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Store Name *</label>
              <input className={styles.input} value={form.storeName} onChange={(e) => setField("storeName", e.target.value)} required />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Store URL Slug</label>
              <input className={styles.inputDisabled} value={form.storeSlug} readOnly disabled />
              <p className={styles.hint}>Slug cannot be changed after approval.</p>
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Store Description</label>
            <textarea className={styles.textarea} rows={3} value={form.storeDescription ?? ""} onChange={(e) => setField("storeDescription", e.target.value)} />
          </div>
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Store Logo</label>
              {form.logoUrl && <img src={form.logoUrl} alt="Logo" className={styles.logoPreview} />}
              <MediaUploader
                onUpload={(files: UploadedFile[]) => setField("logoUrl", files[0]?.url ?? null)}
                accept={["image/jpeg", "image/png", "image/webp"]}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Store Banner</label>
              {form.bannerUrl && <img src={form.bannerUrl} alt="Banner" className={styles.bannerPreview} />}
              <MediaUploader
                onUpload={(files: UploadedFile[]) => setField("bannerUrl", files[0]?.url ?? null)}
                accept={["image/jpeg", "image/png", "image/webp"]}
              />
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Contact Details</h3>
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Store Email</label>
              <input type="email" className={styles.input} value={form.email ?? ""} onChange={(e) => setField("email", e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Store Phone</label>
              <input className={styles.input} value={form.phone ?? ""} onChange={(e) => setField("phone", e.target.value)} />
            </div>
          </div>
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>City</label>
              <input className={styles.input} value={form.city ?? ""} onChange={(e) => setField("city", e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>State</label>
              <input className={styles.input} value={form.state ?? ""} onChange={(e) => setField("state", e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Pincode</label>
              <input className={styles.input} value={form.pincode ?? ""} onChange={(e) => setField("pincode", e.target.value)} />
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Tax & Banking</h3>
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>GSTIN</label>
              <input className={styles.input} value={form.gstin ?? ""} onChange={(e) => setField("gstin", e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>PAN</label>
              <input className={styles.input} value={form.pan ?? ""} onChange={(e) => setField("pan", e.target.value)} />
            </div>
          </div>
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Bank Account</label>
              <input className={styles.input} value={form.bankAccount ?? ""} onChange={(e) => setField("bankAccount", e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>IFSC Code</label>
              <input className={styles.input} value={form.bankIfsc ?? ""} onChange={(e) => setField("bankIfsc", e.target.value)} />
            </div>
          </div>
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Bank Name</label>
              <input className={styles.input} value={form.bankName ?? ""} onChange={(e) => setField("bankName", e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Account Holder</label>
              <input className={styles.input} value={form.accountHolder ?? ""} onChange={(e) => setField("accountHolder", e.target.value)} />
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>SEO (optional)</h3>
          <div className={styles.field}>
            <label className={styles.label}>Meta Title</label>
            <input className={styles.input} value={form.metaTitle ?? ""} onChange={(e) => setField("metaTitle", e.target.value)} placeholder="Defaults to store name" />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Meta Description</label>
            <textarea className={styles.textarea} rows={2} value={form.metaDescription ?? ""} onChange={(e) => setField("metaDescription", e.target.value)} />
          </div>
        </div>

        <div className={styles.saveRow}>
          <button type="submit" className={styles.saveBtn} disabled={saving}>
            {saving ? "Saving…" : "Save Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
