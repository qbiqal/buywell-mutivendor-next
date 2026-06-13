"use client";
import React, { useEffect, useState } from "react";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardBody, CardFooter } from "@/components/ui/Card";
import { MediaUploader } from "@/components/media/MediaUploader";
import { useToast } from "@/components/ui/Toast";
import type { UploadedFile } from "@/components/media/MediaUploader";
import styles from "./settings.module.css";

const MODULE_SETTINGS = [
  { key: "module_core_enabled", label: "Core", description: "Auth, admin shell, settings, DB, Redis, cache", locked: true },
  { key: "module_cms_enabled", label: "CMS", description: "Homepage sections, landing content, testimonials" },
  { key: "module_seo_enabled", label: "SEO", description: "Metadata, sitemap controls, analytics tags, search submissions" },
  { key: "module_blog_enabled", label: "Blog", description: "Public blog and admin blog publishing" },
  { key: "module_ecommerce_enabled", label: "E-Commerce", description: "Shop, cart, checkout, orders, products, payment modules" },
] as const;

const NOTIFICATION_KEYS = [
  "notification_in_app_enabled",
  "notification_email_enabled",
  "notification_email_provider",
  "notification_email_from",
  "notification_resend_enabled",
  "notification_resend_api_key",
  "notification_sms_enabled",
  "notification_sms_provider",
  "notification_sms_api_key",
  "notification_sms_sender_id",
  "notification_sms_auth_token",
  "notification_whatsapp_enabled",
  "notification_telegram_enabled",
  "notification_telegram_bot_token",
  "notification_telegram_chat_id",
  "notification_push_enabled",
  "notification_push_provider",
  "notification_push_vapid_public_key",
  "notification_push_vapid_private_key",
  "notification_push_vapid_subject",
];

const OTP_KEYS = [
  "otp_email_enabled",
  "otp_email_verification_enabled",
  "otp_password_reset_enabled",
  "otp_email_verification_ttl_minutes",
  "otp_password_reset_ttl_minutes",
  "otp_max_attempts",
];

const EXTERNAL_KEY_SETTINGS = [
  "whatsapp_provider",
  "whatsapp_waha_base_url",
  "whatsapp_waha_session",
  "whatsapp_waha_api_key",
  "whatsapp_waha_chat_suffix",
  "whatsapp_phone_number_id",
  "whatsapp_access_token",
  "media_storage",
  "media_r2_account_id",
  "media_r2_access_key_id",
  "media_r2_secret_access_key",
  "media_r2_bucket_name",
  "media_r2_public_url",
  "payment_razorpay_enabled",
  "payment_razorpay_key_id",
  "payment_razorpay_key_secret",
  "payment_razorpay_webhook_secret",
  "payment_stripe_enabled",
  "payment_stripe_publishable_key",
  "payment_stripe_secret_key",
  "payment_stripe_webhook_secret",
  "sentry_enabled",
  "sentry_dsn",
  "sentry_environment",
];

const BRAND_SETTINGS = [
  "site_name",
  "site_tagline",
  "site_email",
  "site_phone",
  "site_address",
  "admin_logo_url",
  "site_logo_url",
];

const SETTINGS_TABS = [
  { key: "modules", label: "Modules" },
  { key: "brand", label: "Brand" },
  { key: "notifications", label: "Notifications" },
  { key: "otp", label: "OTP" },
  { key: "providers", label: "Providers" },
  { key: "localization", label: "Localization" },
  { key: "commerce", label: "Commerce" },
] as const;

type SettingsTab = typeof SETTINGS_TABS[number]["key"];

export default function AdminSettingsClient() {
  const { success, error: showError } = useToast();
  const [config, setConfig] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>("modules");

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

  function setCheckbox(key: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setConfig((p) => ({ ...p, [key]: e.target.checked ? "true" : "false" }));
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
        <p className="admin-page-subtitle">Configure modules, site information, localization, payment, and shipping</p>
      </div>

      <div className={styles.tabs} role="tablist" aria-label="Settings sections">
        {SETTINGS_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.key}
            className={activeTab === tab.key ? styles.activeTab : ""}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Module Controls */}
      {activeTab === "modules" && <Card padding="none" className={styles.settingsCard}>
        <CardHeader><h2 className={styles.sectionTitle}>Modules</h2></CardHeader>
        <CardBody className={styles.cardFields}>
          <p className={styles.fieldHint}>Enable only the modules required for this client install. Core is always on.</p>
          <div className={styles.moduleGrid}>
            {MODULE_SETTINGS.map((module) => (
              <label key={module.key} className={[styles.moduleToggle, "locked" in module && module.locked ? styles.moduleLocked : ""].join(" ")}>
                <input
                  type="checkbox"
                  checked={(config[module.key] ?? "true") !== "false"}
                  onChange={setCheckbox(module.key)}
                  disabled={"locked" in module && module.locked}
                />
                <span>
                  <strong>{module.label}</strong>
                  <small>{module.description}</small>
                </span>
              </label>
            ))}
          </div>
        </CardBody>
        <CardFooter>
          <Button
            variant="primary"
            loading={saving}
            onClick={() => save(["module_core_enabled","module_cms_enabled","module_seo_enabled","module_blog_enabled","module_ecommerce_enabled"])}
          >
            Save Modules
          </Button>
        </CardFooter>
      </Card>}

      {/* Notification Gateway Settings */}
      {activeTab === "notifications" && <Card padding="none" className={styles.settingsCard}>
        <CardHeader><h2 className={styles.sectionTitle}>Notifications & Gateways</h2></CardHeader>
        <CardBody className={styles.cardFields}>
          <p className={styles.fieldHint}>
            Core notification channels are toggleable here. WhatsApp, email, and SMS sends are also gated by their notification wallet balance.
            {" "}<a href="/admin/notification-wallets">Open wallets</a>
          </p>
          <div className={styles.moduleGrid}>
            <label className={styles.moduleToggle}>
              <input type="checkbox" checked={(config.notification_in_app_enabled ?? "true") !== "false"} onChange={setCheckbox("notification_in_app_enabled")} />
              <span><strong>In-app</strong><small>Stores notifications for the signed-in user</small></span>
            </label>
            <label className={styles.moduleToggle}>
              <input type="checkbox" checked={(config.notification_email_enabled ?? "true") !== "false"} onChange={setCheckbox("notification_email_enabled")} />
              <span><strong>Email</strong><small>Routes through the active email provider</small></span>
            </label>
            <label className={styles.moduleToggle}>
              <input type="checkbox" checked={config.notification_sms_enabled === "true"} onChange={setCheckbox("notification_sms_enabled")} />
              <span><strong>SMS</strong><small>Disabled until a provider adapter is added</small></span>
            </label>
            <label className={styles.moduleToggle}>
              <input type="checkbox" checked={(config.notification_whatsapp_enabled ?? "true") !== "false"} onChange={setCheckbox("notification_whatsapp_enabled")} />
              <span><strong>WhatsApp</strong><small>Uses current WhatsApp panel/provider configuration</small></span>
            </label>
            <label className={styles.moduleToggle}>
              <input type="checkbox" checked={config.notification_telegram_enabled === "true"} onChange={setCheckbox("notification_telegram_enabled")} />
              <span><strong>Telegram</strong><small>Disabled until a bot adapter is added</small></span>
            </label>
            <label className={styles.moduleToggle}>
              <input type="checkbox" checked={config.notification_push_enabled === "true"} onChange={setCheckbox("notification_push_enabled")} />
              <span><strong>Push</strong><small>Stores browser subscriptions for future Web Push sends</small></span>
            </label>
          </div>
          <div className={styles.formRow}>
            <Select
              label="Email Provider"
              value={config.notification_email_provider ?? "resend"}
              onChange={(e) => setConfig((p) => ({ ...p, notification_email_provider: e.target.value }))}
              options={[{ value: "resend", label: "Resend" }]}
            />
            <Input label="From Email" value={config.notification_email_from ?? ""} onChange={set("notification_email_from")} placeholder="APRAS Naturals <no-reply@example.com>" />
          </div>
          <label className={styles.inlineCheck}>
            <input
              type="checkbox"
              checked={(config.notification_resend_enabled ?? "true") !== "false"}
              onChange={setCheckbox("notification_resend_enabled")}
            />
            Enable Resend email gateway
          </label>
          <Input
            label="Resend API Key"
            type="password"
            value={config.notification_resend_api_key ?? ""}
            onChange={set("notification_resend_api_key")}
            placeholder="re_..."
            autoComplete="off"
          />
          <div className={styles.formRow}>
            <Input label="SMS Provider Key" value={config.notification_sms_provider ?? ""} onChange={set("notification_sms_provider")} placeholder="future_sms_provider" />
            <Input label="Push Provider Key" value={config.notification_push_provider ?? "web_push"} onChange={set("notification_push_provider")} placeholder="web_push" />
          </div>
          <div className={styles.formRow}>
            <Input label="SMS API Key" type="password" value={config.notification_sms_api_key ?? ""} onChange={set("notification_sms_api_key")} placeholder="provider API key" autoComplete="off" />
            <Input label="SMS Sender ID" value={config.notification_sms_sender_id ?? ""} onChange={set("notification_sms_sender_id")} placeholder="APRAS" />
          </div>
          <Input label="SMS Auth Token" type="password" value={config.notification_sms_auth_token ?? ""} onChange={set("notification_sms_auth_token")} placeholder="provider auth token" autoComplete="off" />
          <div className={styles.formRow}>
            <Input label="Telegram Bot Token" type="password" value={config.notification_telegram_bot_token ?? ""} onChange={set("notification_telegram_bot_token")} placeholder="123456:ABC..." autoComplete="off" />
            <Input label="Telegram Chat ID" value={config.notification_telegram_chat_id ?? ""} onChange={set("notification_telegram_chat_id")} placeholder="-100..." />
          </div>
          <div className={styles.formRow}>
            <Input label="Web Push VAPID Public Key" value={config.notification_push_vapid_public_key ?? ""} onChange={set("notification_push_vapid_public_key")} placeholder="B..." />
            <Input label="Web Push VAPID Private Key" type="password" value={config.notification_push_vapid_private_key ?? ""} onChange={set("notification_push_vapid_private_key")} placeholder="private key" autoComplete="off" />
          </div>
          <Input label="Web Push Subject" value={config.notification_push_vapid_subject ?? ""} onChange={set("notification_push_vapid_subject")} placeholder="mailto:admin@example.com" />
        </CardBody>
        <CardFooter>
          <Button variant="primary" loading={saving} onClick={() => save(NOTIFICATION_KEYS)}>
            Save Notifications
          </Button>
        </CardFooter>
      </Card>}

      {/* OTP Settings */}
      {activeTab === "otp" && <Card padding="none" className={styles.settingsCard}>
        <CardHeader><h2 className={styles.sectionTitle}>OTP & Account Recovery</h2></CardHeader>
        <CardBody className={styles.cardFields}>
          <div className={styles.moduleGrid}>
            <label className={styles.moduleToggle}>
              <input type="checkbox" checked={(config.otp_email_enabled ?? "true") !== "false"} onChange={setCheckbox("otp_email_enabled")} />
              <span><strong>Email OTP</strong><small>Master switch for email-based one-time codes</small></span>
            </label>
            <label className={styles.moduleToggle}>
              <input type="checkbox" checked={(config.otp_email_verification_enabled ?? "true") !== "false"} onChange={setCheckbox("otp_email_verification_enabled")} />
              <span><strong>Email Verification</strong><small>Sends verification code after registration</small></span>
            </label>
            <label className={styles.moduleToggle}>
              <input type="checkbox" checked={(config.otp_password_reset_enabled ?? "true") !== "false"} onChange={setCheckbox("otp_password_reset_enabled")} />
              <span><strong>Password Reset</strong><small>Sends reset code for forgot password</small></span>
            </label>
          </div>
          <div className={styles.formRow}>
            <Input label="Verification TTL (minutes)" value={config.otp_email_verification_ttl_minutes ?? "60"} onChange={set("otp_email_verification_ttl_minutes")} type="number" min="1" />
            <Input label="Password Reset TTL (minutes)" value={config.otp_password_reset_ttl_minutes ?? "30"} onChange={set("otp_password_reset_ttl_minutes")} type="number" min="1" />
          </div>
          <Input label="Max OTP Attempts" value={config.otp_max_attempts ?? "5"} onChange={set("otp_max_attempts")} type="number" min="1" />
        </CardBody>
        <CardFooter>
          <Button variant="primary" loading={saving} onClick={() => save(OTP_KEYS)}>
            Save OTP Settings
          </Button>
        </CardFooter>
      </Card>}

      {/* External Provider Keys */}
      {activeTab === "providers" && <Card padding="none" className={styles.settingsCard}>
        <CardHeader><h2 className={styles.sectionTitle}>External Provider Keys</h2></CardHeader>
        <CardBody className={styles.cardFields}>
          <p className={styles.fieldHint}>Admin values are encrypted before storage. If a field is empty, the matching `.env` value is used as fallback.</p>

          <div className={styles.subSection}>
            <h3 className={styles.subTitle}>WhatsApp Gateway</h3>
            <Select
              label="WhatsApp Provider"
              value={config.whatsapp_provider ?? "waha"}
              onChange={(e) => setConfig((p) => ({ ...p, whatsapp_provider: e.target.value }))}
              options={[
                { value: "waha", label: "WAHA self-hosted gateway" },
                { value: "meta", label: "Meta Cloud API" },
              ]}
            />
            <div className={styles.formRow}>
              <Input label="WAHA Base URL" value={config.whatsapp_waha_base_url ?? "https://whatsapp-gateway.qbiqal.com/"} onChange={set("whatsapp_waha_base_url")} placeholder="https://whatsapp-gateway.qbiqal.com/" />
              <Input label="WAHA Session" value={config.whatsapp_waha_session ?? "default"} onChange={set("whatsapp_waha_session")} placeholder="default" />
            </div>
            <div className={styles.formRow}>
              <Input label="WAHA API Key" type="password" value={config.whatsapp_waha_api_key ?? ""} onChange={set("whatsapp_waha_api_key")} placeholder="X-Api-Key if enabled on WAHA" autoComplete="off" />
              <Input label="WAHA Chat Suffix" value={config.whatsapp_waha_chat_suffix ?? "@c.us"} onChange={set("whatsapp_waha_chat_suffix")} placeholder="@c.us" />
            </div>
          </div>

          <div className={styles.subSection}>
            <h3 className={styles.subTitle}>WhatsApp Meta Cloud Fallback</h3>
            <div className={styles.formRow}>
              <Input label="Phone Number ID" type="password" value={config.whatsapp_phone_number_id ?? ""} onChange={set("whatsapp_phone_number_id")} placeholder="WHATSAPP_PHONE_NUMBER_ID" autoComplete="off" />
              <Input label="Access Token" type="password" value={config.whatsapp_access_token ?? ""} onChange={set("whatsapp_access_token")} placeholder="WHATSAPP_ACCESS_TOKEN" autoComplete="off" />
            </div>
          </div>

          <div className={styles.subSection}>
            <h3 className={styles.subTitle}>Cloudflare R2</h3>
            <Select
              label="Media Storage"
              value={config.media_storage ?? "local"}
              onChange={(e) => setConfig((p) => ({ ...p, media_storage: e.target.value }))}
              options={[{ value: "local", label: "Local" }, { value: "r2", label: "Cloudflare R2" }]}
            />
            <div className={styles.formRow}>
              <Input label="R2 Account ID" value={config.media_r2_account_id ?? ""} onChange={set("media_r2_account_id")} placeholder="CLOUDFLARE_R2_ACCOUNT_ID" />
              <Input label="R2 Bucket" value={config.media_r2_bucket_name ?? ""} onChange={set("media_r2_bucket_name")} placeholder="CLOUDFLARE_R2_BUCKET_NAME" />
            </div>
            <div className={styles.formRow}>
              <Input label="R2 Access Key ID" type="password" value={config.media_r2_access_key_id ?? ""} onChange={set("media_r2_access_key_id")} placeholder="CLOUDFLARE_R2_ACCESS_KEY_ID" autoComplete="off" />
              <Input label="R2 Secret Access Key" type="password" value={config.media_r2_secret_access_key ?? ""} onChange={set("media_r2_secret_access_key")} placeholder="CLOUDFLARE_R2_SECRET_ACCESS_KEY" autoComplete="off" />
            </div>
            <Input label="R2 Public URL" value={config.media_r2_public_url ?? ""} onChange={set("media_r2_public_url")} placeholder="https://media.example.com" />
          </div>

          <div className={styles.subSection}>
            <h3 className={styles.subTitle}>Future Payment Gateways</h3>
            <div className={styles.moduleGrid}>
              <label className={styles.moduleToggle}>
                <input type="checkbox" checked={config.payment_razorpay_enabled === "true"} onChange={setCheckbox("payment_razorpay_enabled")} />
                <span><strong>Razorpay</strong><small>Provider keys are stored now; adapter is added when gateway module is built</small></span>
              </label>
              <label className={styles.moduleToggle}>
                <input type="checkbox" checked={config.payment_stripe_enabled === "true"} onChange={setCheckbox("payment_stripe_enabled")} />
                <span><strong>Stripe</strong><small>Provider keys are stored now; adapter is added when gateway module is built</small></span>
              </label>
            </div>
            <div className={styles.formRow}>
              <Input label="Razorpay Key ID" type="password" value={config.payment_razorpay_key_id ?? ""} onChange={set("payment_razorpay_key_id")} placeholder="rzp_live_..." autoComplete="off" />
              <Input label="Razorpay Key Secret" type="password" value={config.payment_razorpay_key_secret ?? ""} onChange={set("payment_razorpay_key_secret")} placeholder="Razorpay key secret" autoComplete="off" />
            </div>
            <Input label="Razorpay Webhook Secret" type="password" value={config.payment_razorpay_webhook_secret ?? ""} onChange={set("payment_razorpay_webhook_secret")} placeholder="Razorpay webhook secret" autoComplete="off" />
            <div className={styles.formRow}>
              <Input label="Stripe Publishable Key" value={config.payment_stripe_publishable_key ?? ""} onChange={set("payment_stripe_publishable_key")} placeholder="pk_..." />
              <Input label="Stripe Secret Key" type="password" value={config.payment_stripe_secret_key ?? ""} onChange={set("payment_stripe_secret_key")} placeholder="sk_..." autoComplete="off" />
            </div>
            <Input label="Stripe Webhook Secret" type="password" value={config.payment_stripe_webhook_secret ?? ""} onChange={set("payment_stripe_webhook_secret")} placeholder="whsec_..." autoComplete="off" />
          </div>

          <div className={styles.subSection}>
            <h3 className={styles.subTitle}>Observability</h3>
            <label className={styles.inlineCheck}>
              <input type="checkbox" checked={config.sentry_enabled === "true"} onChange={setCheckbox("sentry_enabled")} />
              Enable Sentry when DSN is configured
            </label>
            <div className={styles.formRow}>
              <Input label="Sentry DSN" type="password" value={config.sentry_dsn ?? ""} onChange={set("sentry_dsn")} placeholder="SENTRY_DSN" autoComplete="off" />
              <Input label="Sentry Environment" value={config.sentry_environment ?? "production"} onChange={set("sentry_environment")} placeholder="production" />
            </div>
          </div>
        </CardBody>
        <CardFooter>
          <Button variant="primary" loading={saving} onClick={() => save(EXTERNAL_KEY_SETTINGS)}>
            Save External Keys
          </Button>
        </CardFooter>
      </Card>}

      {/* Site Info */}
      {activeTab === "brand" && <Card padding="none" className={styles.settingsCard}>
        <CardHeader><h2 className={styles.sectionTitle}>Brand & Site Information</h2></CardHeader>
        <CardBody className={styles.cardFields}>
          <Input label="Site Name"    value={config.site_name    ?? ""} onChange={set("site_name")}    placeholder="APRAS Naturals" />
          <Input label="Site Tagline" value={config.site_tagline ?? ""} onChange={set("site_tagline")} placeholder="Pure Honey & Ghee" />
          <Input label="Email"        value={config.site_email   ?? ""} onChange={set("site_email")}   placeholder="aprasnaturals@gmail.com" type="email" />
          <Input label="Phone / WhatsApp" value={config.site_phone ?? ""} onChange={set("site_phone")} placeholder="+91 9470309006" />
          <Textarea label="Address" value={config.site_address ?? ""} onChange={set("site_address")} placeholder="Ranchi – 834005, Jharkhand" />
          <div className={styles.logoGrid}>
            <div className={styles.logoPanel}>
              <div>
                <p className={styles.fieldLabel}>Admin Panel Logo</p>
                <p className={styles.fieldHint}>Sidebar slot renders at 36×36px. Upload target: 144×144px retina square.</p>
              </div>
              {config.admin_logo_url && (
                <div className={styles.logoPreview}>
                  <img src={config.admin_logo_url} alt="Current admin logo" />
                  <span>{config.admin_logo_url}</span>
                  <button type="button" onClick={() => setConfig((p) => ({ ...p, admin_logo_url: "" }))} aria-label="Clear admin logo">x</button>
                </div>
              )}
              <MediaUploader
                accept={["image/jpeg","image/png","image/webp"]}
                aspectRatio={1}
                recommendedDimensions={{ width: 144, height: 144, label: "Admin logo: 144×144px (1:1 square)" }}
                folder="brand"
                onUpload={(files: UploadedFile[]) => { if (files[0]) setConfig((p) => ({ ...p, admin_logo_url: files[0].url })); }}
              />
            </div>
            <div className={styles.logoPanel}>
              <div>
                <p className={styles.fieldLabel}>Website Logo</p>
                <p className={styles.fieldHint}>Header and footer render up to 180×48px. Upload target: 360×96px transparent-friendly lockup.</p>
              </div>
              {config.site_logo_url && (
                <div className={styles.logoPreview}>
                  <img src={config.site_logo_url} alt="Current website logo" />
                  <span>{config.site_logo_url}</span>
                  <button type="button" onClick={() => setConfig((p) => ({ ...p, site_logo_url: "" }))} aria-label="Clear website logo">x</button>
                </div>
              )}
              <MediaUploader
                accept={["image/jpeg","image/png","image/webp"]}
                aspectRatio={15 / 4}
                recommendedDimensions={{ width: 360, height: 96, label: "Website logo: 360×96px (15:4 lockup)" }}
                folder="brand"
                onUpload={(files: UploadedFile[]) => { if (files[0]) setConfig((p) => ({ ...p, site_logo_url: files[0].url })); }}
              />
            </div>
          </div>
        </CardBody>
        <CardFooter>
          <Button variant="primary" loading={saving} onClick={() => save(BRAND_SETTINGS)}>
            Save Brand Settings
          </Button>
        </CardFooter>
      </Card>}

      {/* Localization */}
      {activeTab === "localization" && <Card padding="none" className={styles.settingsCard}>
        <CardHeader><h2 className={styles.sectionTitle}>Localization & Currency</h2></CardHeader>
        <CardBody className={styles.cardFields}>
          <div className={styles.formRow}>
            <Input label="Default Locale" value={config.locale_default ?? "en"} onChange={set("locale_default")} placeholder="en" />
            <Input label="Enabled Locales" value={config.locales_enabled ?? "en,hi"} onChange={set("locales_enabled")} placeholder="en,hi" />
          </div>
          <div className={styles.formRow}>
            <Input label="Default Currency" value={config.currency_default ?? "INR"} onChange={set("currency_default")} placeholder="INR" />
            <Input label="Enabled Currencies" value={config.currencies_enabled ?? "INR"} onChange={set("currencies_enabled")} placeholder="INR,USD" />
          </div>
          <Textarea
            label="Currency Rates JSON"
            value={config.currency_rates_json ?? "{\"INR\":1}"}
            onChange={set("currency_rates_json")}
            placeholder='{"INR":1,"USD":0.012}'
            rows={3}
          />
        </CardBody>
        <CardFooter>
          <Button
            variant="primary"
            loading={saving}
            onClick={() => save(["locale_default","locales_enabled","currency_default","currencies_enabled","currency_rates_json"])}
          >
            Save Localization
          </Button>
        </CardFooter>
      </Card>}

      {/* Payment Settings */}
      {activeTab === "commerce" && <Card padding="none" className={styles.settingsCard}>
        <CardHeader><h2 className={styles.sectionTitle}>Payment — QR Code Setup</h2></CardHeader>
        <CardBody className={styles.cardFields}>
          <label className={styles.inlineCheck}>
            <input
              type="checkbox"
              checked={(config.payment_offline_qr_enabled ?? "true") !== "false"}
              onChange={setCheckbox("payment_offline_qr_enabled")}
            />
            Enable Offline QR payment gateway
          </label>
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
          <Button variant="primary" loading={saving} onClick={() => save(["payment_offline_qr_enabled","payment_qr_url","payment_upi_id","payment_company_name"])}>
            Save Payment Settings
          </Button>
        </CardFooter>
      </Card>}

      {/* Shipping Settings */}
      {activeTab === "commerce" && <Card padding="none" className={styles.settingsCard}>
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
      </Card>}
    </div>
  );
}
