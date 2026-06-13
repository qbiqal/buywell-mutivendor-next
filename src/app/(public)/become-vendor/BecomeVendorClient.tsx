"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import styles from "./become-vendor.module.css";

interface ApplicationStatus {
  status: "pending" | "approved" | "rejected" | "suspended";
  storeName: string;
  createdAt: string;
  rejectedReason?: string | null;
}

export function BecomeVendorClient() {
  const router = useRouter();
  const toast = useToast();

  const [existing, setExisting] = useState<ApplicationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
    storeName: "",
    storeSlug: "",
    storeDescription: "",
    phone: "",
    email: "",
    city: "",
    state: "",
    pincode: "",
    gstin: "",
    pan: "",
    bankAccount: "",
    bankIfsc: "",
    bankName: "",
    accountHolder: "",
    agreeTerms: false,
  });

  useEffect(() => {
    fetch("/api/vendor/apply")
      .then((r) => r.json())
      .then((d) => { if (d.vendor) setExisting(d.vendor); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function setField(key: string, value: string | boolean) {
    setForm((f) => ({ ...f, [key]: value }));
    if (key === "storeName" && typeof value === "string") {
      setForm((f) => ({
        ...f,
        storeName: value,
        storeSlug: value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.agreeTerms) { toast.error("Please agree to the terms."); return; }
    if (!form.storeName.trim() || !form.storeSlug.trim()) { toast.error("Store name is required."); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/vendor/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Submission failed."); return; }
      toast.success("Application submitted! We'll review and get back to you.");
      setExisting({ status: "pending", storeName: form.storeName, createdAt: new Date().toISOString() });
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Loading…</div>
      </div>
    );
  }

  if (existing) {
    const statusConfig = {
      pending:   { icon: "⏳", label: "Under Review",  color: "#f59e0b", bg: "#fef3c7" },
      approved:  { icon: "✅", label: "Approved",       color: "#0d7659", bg: "#e6f5f0" },
      rejected:  { icon: "❌", label: "Rejected",       color: "#dc2626", bg: "#fee2e2" },
      suspended: { icon: "🚫", label: "Suspended",      color: "#6b7280", bg: "#f3f4f6" },
    }[existing.status];

    return (
      <div className={styles.page}>
        <div className={styles.statusCard}>
          <div className={styles.statusIcon} style={{ background: statusConfig.bg }}>{statusConfig.icon}</div>
          <h2 className={styles.statusTitle}>{statusConfig.label}</h2>
          <p className={styles.storeName}>{existing.storeName}</p>
          {existing.status === "pending" && (
            <p className={styles.statusMsg}>Your application is being reviewed. We'll notify you via email within 2–3 business days.</p>
          )}
          {existing.status === "approved" && (
            <p className={styles.statusMsg}>
              Congratulations! Your vendor account is active.{" "}
              <button className={styles.dashBtn} onClick={() => router.push("/vendor/dashboard")}>
                Go to Vendor Dashboard
              </button>
            </p>
          )}
          {existing.status === "rejected" && (
            <p className={styles.statusMsg}>
              Your application was not approved.
              {existing.rejectedReason && <span className={styles.reason}> Reason: {existing.rejectedReason}</span>}
              {" "}Contact support if you have questions.
            </p>
          )}
          {existing.status === "suspended" && (
            <p className={styles.statusMsg}>Your vendor account has been suspended. Please contact support.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.heroInner}>
          <h1 className={styles.heroTitle}>Sell on BuyWell</h1>
          <p className={styles.heroSub}>Reach thousands of customers. Zero listing fee. Grow your business today.</p>
          <div className={styles.perks}>
            <div className={styles.perk}><span>📦</span> Easy product management</div>
            <div className={styles.perk}><span>💰</span> Transparent payouts</div>
            <div className={styles.perk}><span>📊</span> Real-time analytics</div>
            <div className={styles.perk}><span>🚀</span> Dedicated seller support</div>
          </div>
        </div>
      </div>

      <div className={styles.formWrap}>
        <div className={styles.steps}>
          <div className={`${styles.stepDot} ${step >= 1 ? styles.active : ""}`}>1</div>
          <div className={styles.stepLine} />
          <div className={`${styles.stepDot} ${step >= 2 ? styles.active : ""}`}>2</div>
          <div className={styles.stepLine} />
          <div className={`${styles.stepDot} ${step >= 3 ? styles.active : ""}`}>3</div>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {step === 1 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Store Details</h2>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Store Name *</label>
                <input className={styles.input} value={form.storeName} onChange={(e) => setField("storeName", e.target.value)} placeholder="e.g. Green Farms India" required />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Store URL Slug *</label>
                <div className={styles.slugWrap}>
                  <span className={styles.slugPrefix}>buywell.in/store/</span>
                  <input className={styles.slugInput} value={form.storeSlug} onChange={(e) => setField("storeSlug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} required />
                </div>
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Store Description</label>
                <textarea className={styles.textarea} rows={3} value={form.storeDescription} onChange={(e) => setField("storeDescription", e.target.value)} placeholder="Tell customers about your store…" />
              </div>
              <div className={styles.row}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Contact Phone</label>
                  <input className={styles.input} value={form.phone} onChange={(e) => setField("phone", e.target.value)} placeholder="+91 XXXXX XXXXX" />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Contact Email</label>
                  <input type="email" className={styles.input} value={form.email} onChange={(e) => setField("email", e.target.value)} placeholder="store@example.com" />
                </div>
              </div>
              <button type="button" className={styles.nextBtn} onClick={() => { if (!form.storeName.trim()) { toast.error("Store name is required."); return; } setStep(2); }}>
                Continue →
              </button>
            </section>
          )}

          {step === 2 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Business & Bank Details</h2>
              <div className={styles.row}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>City</label>
                  <input className={styles.input} value={form.city} onChange={(e) => setField("city", e.target.value)} placeholder="Mumbai" />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>State</label>
                  <input className={styles.input} value={form.state} onChange={(e) => setField("state", e.target.value)} placeholder="Maharashtra" />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Pincode</label>
                  <input className={styles.input} value={form.pincode} onChange={(e) => setField("pincode", e.target.value)} placeholder="400001" />
                </div>
              </div>
              <div className={styles.row}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>GSTIN</label>
                  <input className={styles.input} value={form.gstin} onChange={(e) => setField("gstin", e.target.value)} placeholder="22AAAAA0000A1Z5" />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>PAN</label>
                  <input className={styles.input} value={form.pan} onChange={(e) => setField("pan", e.target.value)} placeholder="ABCDE1234F" />
                </div>
              </div>
              <div className={styles.row}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Bank Account Number</label>
                  <input className={styles.input} value={form.bankAccount} onChange={(e) => setField("bankAccount", e.target.value)} />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>IFSC Code</label>
                  <input className={styles.input} value={form.bankIfsc} onChange={(e) => setField("bankIfsc", e.target.value)} placeholder="SBIN0001234" />
                </div>
              </div>
              <div className={styles.row}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Bank Name</label>
                  <input className={styles.input} value={form.bankName} onChange={(e) => setField("bankName", e.target.value)} placeholder="State Bank of India" />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Account Holder Name</label>
                  <input className={styles.input} value={form.accountHolder} onChange={(e) => setField("accountHolder", e.target.value)} />
                </div>
              </div>
              <div className={styles.navRow}>
                <button type="button" className={styles.backBtn} onClick={() => setStep(1)}>← Back</button>
                <button type="button" className={styles.nextBtn} onClick={() => setStep(3)}>Continue →</button>
              </div>
            </section>
          )}

          {step === 3 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Review & Submit</h2>
              <div className={styles.reviewCard}>
                <div className={styles.reviewItem}><span>Store Name</span><strong>{form.storeName}</strong></div>
                <div className={styles.reviewItem}><span>Store URL</span><strong>buywell.in/store/{form.storeSlug}</strong></div>
                {form.city && <div className={styles.reviewItem}><span>City</span><strong>{form.city}, {form.state}</strong></div>}
                {form.gstin && <div className={styles.reviewItem}><span>GSTIN</span><strong>{form.gstin}</strong></div>}
                {form.bankAccount && <div className={styles.reviewItem}><span>Bank Account</span><strong>••••{form.bankAccount.slice(-4)}</strong></div>}
              </div>
              <label className={styles.checkLabel}>
                <input type="checkbox" checked={form.agreeTerms} onChange={(e) => setField("agreeTerms", e.target.checked)} />
                <span>I agree to BuyWell's <a href="/terms" className={styles.link}>Terms of Service</a> and <a href="/privacy" className={styles.link}>Privacy Policy</a>. I confirm the information is accurate.</span>
              </label>
              <div className={styles.navRow}>
                <button type="button" className={styles.backBtn} onClick={() => setStep(2)}>← Back</button>
                <button type="submit" className={styles.submitBtn} disabled={submitting || !form.agreeTerms}>
                  {submitting ? "Submitting…" : "Submit Application"}
                </button>
              </div>
            </section>
          )}
        </form>
      </div>
    </div>
  );
}
