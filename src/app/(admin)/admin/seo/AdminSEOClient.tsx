"use client";
import React, { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { MediaUploader } from "@/components/media/MediaUploader";
import type { UploadedFile } from "@/components/media/MediaUploader";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import type { SeoInternalLink, SeoPageOverride, SeoSearchSubmission } from "@/lib/db/schema";
import styles from "./seo.module.css";

interface SeoData {
  config: Record<string, string>;
  overrides: SeoPageOverride[];
  internalLinks: SeoInternalLink[];
  submissions: SeoSearchSubmission[];
  sitemapUrl: string;
}

const SETTING_KEYS = [
  "seo_default_title",
  "seo_title_template",
  "seo_default_description",
  "seo_default_keywords",
  "seo_canonical_base_url",
  "seo_default_og_image_url",
  "seo_indexing_enabled",
  "seo_google_site_verification",
  "seo_bing_site_verification",
  "seo_yandex_site_verification",
  "seo_gtm_id",
  "seo_ga_measurement_id",
  "seo_meta_pixel_id",
  "seo_first_party_analytics_enabled",
  "seo_robots_extra_disallow",
  "seo_sitemap_change_frequency",
  "seo_sitemap_priority_default",
  "seo_submission_google_endpoint",
  "seo_submission_bing_endpoint",
];

const ROBOTS_OPTIONS = [
  { value: "index,follow", label: "Index, follow" },
  { value: "noindex,follow", label: "No index, follow" },
  { value: "index,nofollow", label: "Index, no follow" },
  { value: "noindex,nofollow", label: "No index, no follow" },
];

export default function AdminSEOClient() {
  const { success, error: showError } = useToast();
  const [data, setData] = useState<SeoData | null>(null);
  const [config, setConfig] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [override, setOverride] = useState(defaultOverride());
  const [link, setLink] = useState(defaultLink());

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const res = await fetch("/api/admin/seo");
    const json = await res.json();
    if (json.success) {
      setData(json.data);
      setConfig(json.data.config);
    }
  }

  function set(key: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setConfig((current) => ({ ...current, [key]: e.target.value }));
  }

  function setCheckbox(key: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setConfig((current) => ({ ...current, [key]: e.target.checked ? "true" : "false" }));
  }

  async function saveSettings() {
    setSaving(true);
    try {
      const settings = Object.fromEntries(SETTING_KEYS.map((key) => [key, config[key] ?? ""]));
      const res = await fetch("/api/admin/seo", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      const json = await res.json();
      if (!json.success) {
        showError(json.error ?? "Save failed");
        return;
      }
      success("SEO settings saved");
      load();
    } finally {
      setSaving(false);
    }
  }

  async function saveOverride() {
    if (!override.routePath.trim()) {
      showError("Route path is required");
      return;
    }
    const res = await fetch("/api/admin/seo", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ override }),
    });
    const json = await res.json();
    if (!json.success) {
      showError(json.error ?? "Save failed");
      return;
    }
    success("Route SEO override saved");
    setOverride(defaultOverride());
    load();
  }

  async function saveInternalLink() {
    const res = await fetch("/api/admin/seo", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ internalLink: link }),
    });
    const json = await res.json();
    if (!json.success) {
      showError(json.error ?? "Save failed");
      return;
    }
    success("Internal link saved");
    setLink(defaultLink());
    load();
  }

  async function deleteRecord(kind: "override" | "link", id: string) {
    const payload = kind === "override" ? { deleteOverrideId: id } : { deleteInternalLinkId: id };
    const res = await fetch("/api/admin/seo", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!json.success) {
      showError(json.error ?? "Delete failed");
      return;
    }
    success("Deleted");
    load();
  }

  async function submitSitemap(engine: "google" | "bing") {
    if (!data) return;
    const endpoint = engine === "google" ? config.seo_submission_google_endpoint : config.seo_submission_bing_endpoint;
    const res = await fetch("/api/admin/seo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ engine, endpoint, sitemapUrl: data.sitemapUrl }),
    });
    const json = await res.json();
    if (!json.success) {
      showError(json.error ?? "Submission failed");
      return;
    }
    success("Submission recorded");
    load();
  }

  if (!data) return <div className={styles.loadingWrap}><Spinner size="lg" /></div>;

  return (
    <div className={styles.content}>
      <div className={styles.header}>
        <div>
          <h1 className="admin-page-title">SEO & Analytics</h1>
          <p className="admin-page-subtitle">Metadata, search crawling, analytics tags, internal linking, and submission logs</p>
        </div>
        <a href={data.sitemapUrl} target="_blank" rel="noopener noreferrer" className={styles.sitemapLink}>View Sitemap</a>
      </div>

      <div className={styles.grid}>
        <Card padding="none" className={styles.card}>
          <CardHeader><h2 className={styles.sectionTitle}>Sitewide SEO</h2></CardHeader>
          <CardBody className={styles.formStack}>
            <div className={styles.formRow}>
              <Input label="Default Title" value={config.seo_default_title ?? ""} onChange={set("seo_default_title")} placeholder="BuyWell Marketplace" />
              <Input label="Title Template" value={config.seo_title_template ?? "%s | BuyWell Marketplace"} onChange={set("seo_title_template")} />
            </div>
            <Textarea label="Default Description" rows={3} value={config.seo_default_description ?? ""} onChange={set("seo_default_description")} />
            <Input label="Default Keywords" value={config.seo_default_keywords ?? ""} onChange={set("seo_default_keywords")} placeholder="honey, A2 ghee, raw honey" />
            <div className={styles.formRow}>
              <Input label="Canonical Base URL" value={config.seo_canonical_base_url ?? ""} onChange={set("seo_canonical_base_url")} placeholder="https://buywell.in" />
              <Input label="Default Sitemap Priority" value={config.seo_sitemap_priority_default ?? "0.7"} onChange={set("seo_sitemap_priority_default")} />
            </div>
            <Select
              label="Default Sitemap Change Frequency"
              value={config.seo_sitemap_change_frequency ?? "weekly"}
              onChange={(e) => setConfig((current) => ({ ...current, seo_sitemap_change_frequency: e.target.value }))}
              options={["always","hourly","daily","weekly","monthly","yearly","never"].map((value) => ({ value, label: value }))}
            />
            <label className={styles.inlineCheck}>
              <input type="checkbox" checked={(config.seo_indexing_enabled ?? "true") !== "false"} onChange={setCheckbox("seo_indexing_enabled")} />
              Allow search engines to index public pages
            </label>
            <Textarea label="Extra robots.txt Disallow Paths" rows={3} value={config.seo_robots_extra_disallow ?? ""} onChange={set("seo_robots_extra_disallow")} placeholder="/private-campaign" />
            <div className={styles.ogUploader}>
              <p className={styles.fieldLabel}>Default Open Graph Image</p>
              {config.seo_default_og_image_url && <img src={config.seo_default_og_image_url} alt="Default Open Graph" />}
              <MediaUploader
                accept={["image/jpeg","image/png","image/webp"]}
                aspectRatio={1200 / 630}
                recommendedDimensions={{ width: 1200, height: 630, label: "Default Open Graph: 1200×630px" }}
                folder="seo"
                onUpload={(files: UploadedFile[]) => { if (files[0]) setConfig((current) => ({ ...current, seo_default_og_image_url: files[0].url })); }}
              />
            </div>
          </CardBody>
        </Card>

        <Card padding="none" className={styles.card}>
          <CardHeader><h2 className={styles.sectionTitle}>Analytics & Verification</h2></CardHeader>
          <CardBody className={styles.formStack}>
            <div className={styles.formRow}>
              <Input label="Google Tag Manager ID" value={config.seo_gtm_id ?? ""} onChange={set("seo_gtm_id")} placeholder="GTM-XXXXXXX" />
              <Input label="GA Measurement ID" value={config.seo_ga_measurement_id ?? ""} onChange={set("seo_ga_measurement_id")} placeholder="G-XXXXXXXXXX" />
            </div>
            <Input label="Meta Pixel ID" value={config.seo_meta_pixel_id ?? ""} onChange={set("seo_meta_pixel_id")} />
            <label className={styles.inlineCheck}>
              <input type="checkbox" checked={(config.seo_first_party_analytics_enabled ?? "true") !== "false"} onChange={setCheckbox("seo_first_party_analytics_enabled")} />
              Track first-party traffic in admin analytics
            </label>
            <div className={styles.formRow}>
              <Input label="Google Site Verification" value={config.seo_google_site_verification ?? ""} onChange={set("seo_google_site_verification")} />
              <Input label="Bing Site Verification" value={config.seo_bing_site_verification ?? ""} onChange={set("seo_bing_site_verification")} />
            </div>
            <Input label="Yandex Verification" value={config.seo_yandex_site_verification ?? ""} onChange={set("seo_yandex_site_verification")} />
            <div className={styles.formRow}>
              <Input label="Google Submission Endpoint" value={config.seo_submission_google_endpoint ?? ""} onChange={set("seo_submission_google_endpoint")} />
              <Input label="Bing Submission Endpoint" value={config.seo_submission_bing_endpoint ?? ""} onChange={set("seo_submission_bing_endpoint")} />
            </div>
            <div className={styles.buttonRow}>
              <Button variant="outline" onClick={() => submitSitemap("google")}>Record Google Submission</Button>
              <Button variant="outline" onClick={() => submitSitemap("bing")}>Record Bing Submission</Button>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className={styles.saveBar}>
        <Button variant="primary" loading={saving} onClick={saveSettings}>Save SEO Settings</Button>
      </div>

      <div className={styles.grid}>
        <Card padding="none" className={styles.card}>
          <CardHeader><h2 className={styles.sectionTitle}>Route SEO Overrides</h2></CardHeader>
          <CardBody className={styles.formStack}>
            <div className={styles.formRow}>
              <Input label="Route Path" value={override.routePath} onChange={(e) => setOverride((current) => ({ ...current, routePath: e.target.value }))} placeholder="/shop" />
              <Select label="Robots" value={override.robots} onChange={(e) => setOverride((current) => ({ ...current, robots: e.target.value }))} options={ROBOTS_OPTIONS} />
            </div>
            <Input label="Title" value={override.title} onChange={(e) => setOverride((current) => ({ ...current, title: e.target.value }))} />
            <Textarea label="Description" rows={2} value={override.description} onChange={(e) => setOverride((current) => ({ ...current, description: e.target.value }))} />
            <div className={styles.formRow}>
              <Input label="Keywords" value={override.keywords} onChange={(e) => setOverride((current) => ({ ...current, keywords: e.target.value }))} />
              <Input label="Canonical URL" value={override.canonicalUrl} onChange={(e) => setOverride((current) => ({ ...current, canonicalUrl: e.target.value }))} />
            </div>
            <Input label="Open Graph Image URL" value={override.ogImageUrl} onChange={(e) => setOverride((current) => ({ ...current, ogImageUrl: e.target.value }))} />
            <Textarea label="Structured Data JSON" rows={4} value={override.structuredData} onChange={(e) => setOverride((current) => ({ ...current, structuredData: e.target.value }))} />
            <Button variant="primary" onClick={saveOverride}>Save Override</Button>
            <RecordList
              rows={data.overrides.map((row) => ({
                id: row.id,
                title: row.routePath,
                meta: row.title || row.description || "Custom route SEO",
                badge: row.robots,
              }))}
              onDelete={(id) => deleteRecord("override", id)}
            />
          </CardBody>
        </Card>

        <Card padding="none" className={styles.card}>
          <CardHeader><h2 className={styles.sectionTitle}>Internal Linking</h2></CardHeader>
          <CardBody className={styles.formStack}>
            <div className={styles.formRow}>
              <Input label="Source Path" value={link.sourcePath} onChange={(e) => setLink((current) => ({ ...current, sourcePath: e.target.value }))} placeholder="/about" />
              <Input label="Target Path" value={link.targetPath} onChange={(e) => setLink((current) => ({ ...current, targetPath: e.target.value }))} placeholder="/shop" />
            </div>
            <Input label="Anchor Text" value={link.anchorText} onChange={(e) => setLink((current) => ({ ...current, anchorText: e.target.value }))} placeholder="pure honey collection" />
            <Textarea label="Context" rows={2} value={link.context} onChange={(e) => setLink((current) => ({ ...current, context: e.target.value }))} />
            <Button variant="primary" onClick={saveInternalLink}>Save Internal Link</Button>
            <RecordList
              rows={data.internalLinks.map((row) => ({
                id: row.id,
                title: `${row.sourcePath} -> ${row.targetPath}`,
                meta: row.anchorText,
                badge: row.isEnabled ? "enabled" : "disabled",
              }))}
              onDelete={(id) => deleteRecord("link", id)}
            />
          </CardBody>
        </Card>
      </div>

      <Card padding="none" className={styles.card}>
        <CardHeader><h2 className={styles.sectionTitle}>Search Submission Log</h2></CardHeader>
        <CardBody>
          <RecordList
            rows={data.submissions.map((row) => ({
              id: row.id,
              title: `${row.engine} - ${row.sitemapUrl}`,
              meta: row.response ?? "No response recorded",
              badge: row.status,
            }))}
            readonly
          />
        </CardBody>
      </Card>
    </div>
  );
}

function RecordList({
  rows,
  onDelete,
  readonly = false,
}: {
  rows: Array<{ id: string; title: string; meta: string; badge: string }>;
  onDelete?: (id: string) => void;
  readonly?: boolean;
}) {
  if (rows.length === 0) return <p className={styles.empty}>No records yet.</p>;
  return (
    <div className={styles.recordList}>
      {rows.map((row) => (
        <div key={row.id} className={styles.recordRow}>
          <div>
            <strong>{row.title}</strong>
            <span>{row.meta}</span>
          </div>
          <Badge variant="info">{row.badge}</Badge>
          {!readonly && <button type="button" onClick={() => onDelete?.(row.id)}>Delete</button>}
        </div>
      ))}
    </div>
  );
}

function defaultOverride() {
  return {
    routePath: "",
    title: "",
    description: "",
    keywords: "",
    canonicalUrl: "",
    ogImageUrl: "",
    robots: "index,follow",
    structuredData: "",
  };
}

function defaultLink() {
  return {
    sourcePath: "",
    targetPath: "",
    anchorText: "",
    context: "",
    isEnabled: true,
    sortOrder: 0,
  };
}
