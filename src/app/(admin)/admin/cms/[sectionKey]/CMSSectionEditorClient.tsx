"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { MediaUploader, type UploadedFile } from "@/components/media/MediaUploader";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import type { CmsSection } from "@/lib/db/schema";
import styles from "./cms-section-editor.module.css";

interface Props {
  sectionKey: string;
}

export default function CMSSectionEditorClient({ sectionKey }: Props) {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const [section, setSection] = useState<CmsSection | null>(null);
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [configJson, setConfigJson] = useState("{}");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/cms/${sectionKey}`)
      .then((res) => res.json())
      .then((json) => {
        if (!json.success || !json.data) {
          showError("CMS section not found");
          return;
        }
        setSection(json.data);
        const nextConfig = isRecord(json.data.config) ? json.data.config : {};
        setConfig(nextConfig);
        setConfigJson(JSON.stringify(nextConfig, null, 2));
      })
      .finally(() => setLoading(false));
  }, [sectionKey, showError]);

  async function save() {
    if (!section) return;
    let parsed: unknown;
    try {
      parsed = advancedOpen ? JSON.parse(configJson || "{}") : config;
    } catch {
      showError("Config JSON is invalid");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/cms/${section.sectionKey}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: parsed,
          isEnabled: section.isEnabled,
          sortOrder: section.sortOrder,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        showError(data.error ?? "Save failed");
        return;
      }
      success("CMS section saved");
      router.push("/admin/cms");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className={styles.loadingWrap}><Spinner size="lg" /></div>;
  if (!section) return <div className={styles.content}>Section not found.</div>;
  const currentSection = section;

  function updateConfig(path: Array<string | number>, value: unknown) {
    setConfig((current) => {
      const next = setAtPath(current, path, value) as Record<string, unknown>;
      setConfigJson(JSON.stringify(next, null, 2));
      return next;
    });
  }

  function resetConfig() {
    const next = isRecord(currentSection.config) ? currentSection.config : {};
    setConfig(next);
    setConfigJson(JSON.stringify(next, null, 2));
  }

  return (
    <div className={styles.content}>
      <div className={styles.header}>
        <div>
          <h1 className="admin-page-title">Edit CMS Section</h1>
          <p className="admin-page-subtitle">{section.sectionKey}</p>
        </div>
        <Button variant="ghost" onClick={() => router.push("/admin/cms")}>Back</Button>
      </div>

      <div className={styles.panel}>
        <div className={styles.helpBox}>
          Edit section content directly below. Media fields such as <code>videoUrl</code>, <code>imageUrl</code>, <code>items[].img</code>, and <code>items[].mediaUrl</code> include the auto-crop uploader.
        </div>
        <label className={styles.inlineCheck}>
          <input
            type="checkbox"
            checked={section.isEnabled}
            onChange={(e) => setSection((current) => current ? { ...current, isEnabled: e.target.checked } : current)}
          />
          Section enabled
        </label>
        <Input
          label="Sort Order"
          type="number"
          value={String(section.sortOrder)}
          onChange={(e) => setSection((current) => current ? { ...current, sortOrder: parseInt(e.target.value || "0", 10) } : current)}
        />
        <div className={styles.builder}>
          {Object.entries(config).map(([key, value]) => renderField(key, value, [key], updateConfig))}
        </div>
        <button type="button" className={styles.advancedToggle} onClick={() => setAdvancedOpen((open) => !open)}>
          {advancedOpen ? "Hide Advanced JSON" : "Show Advanced JSON"}
        </button>
        {advancedOpen && (
          <Textarea
            label="Advanced Section Config JSON"
            value={configJson}
            onChange={(e) => setConfigJson(e.target.value)}
            rows={18}
            className={styles.codeArea}
            spellCheck={false}
          />
        )}
        <div className={styles.actions}>
          <Button variant="outline" onClick={resetConfig}>Reset</Button>
          <Button variant="primary" loading={saving} onClick={save}>Save Section</Button>
        </div>
      </div>
    </div>
  );
}

function renderField(
  label: string,
  value: unknown,
  path: Array<string | number>,
  onChange: (path: Array<string | number>, value: unknown) => void,
): React.ReactNode {
  const key = path.join(".");
  const niceLabel = humanize(label);

  if (typeof value === "boolean") {
    return (
      <label key={key} className={styles.inlineCheck}>
        <input type="checkbox" checked={value} onChange={(event) => onChange(path, event.target.checked)} />
        {niceLabel}
      </label>
    );
  }

  if (typeof value === "number") {
    return (
      <Input key={key} label={niceLabel} type="number" value={String(value)} onChange={(event) => onChange(path, Number(event.target.value))} />
    );
  }

  if (typeof value === "string") {
    const isMedia = isMediaKey(label);
    return (
      <div key={key} className={styles.fieldGroup}>
        <Input label={niceLabel} value={value} onChange={(event) => onChange(path, event.target.value)} />
        {isMedia && (
          <MediaField value={value} onChange={(url) => onChange(path, url)} label={label} />
        )}
      </div>
    );
  }

  if (Array.isArray(value)) {
    return (
      <div key={key} className={styles.arrayGroup}>
        <div className={styles.groupHeader}>
          <h3>{niceLabel}</h3>
          <button
            type="button"
            onClick={() => onChange(path, [...value, value.every((item) => typeof item === "string") ? "" : {}])}
          >
            Add
          </button>
        </div>
        {value.map((item, index) => (
          <div key={`${key}.${index}`} className={styles.arrayItem}>
            <button type="button" className={styles.removeItem} onClick={() => onChange(path, value.filter((_, itemIndex) => itemIndex !== index))}>x</button>
            {renderField(`${label} ${index + 1}`, item, [...path, index], onChange)}
          </div>
        ))}
      </div>
    );
  }

  if (isRecord(value)) {
    return (
      <div key={key} className={styles.objectGroup}>
        <h3>{niceLabel}</h3>
        {Object.entries(value).map(([childKey, childValue]) => renderField(childKey, childValue, [...path, childKey], onChange))}
      </div>
    );
  }

  return null;
}

function MediaField({ value, onChange, label }: { value: string; onChange: (url: string) => void; label: string }) {
  const isVideo = /video/i.test(label);
  return (
    <div className={styles.mediaControl}>
      {value && (
        <div className={styles.mediaPreview}>
          {isVideo ? <video src={value} controls /> : <img src={value} alt="" />}
          <button type="button" onClick={() => onChange("")}>x</button>
        </div>
      )}
      <MediaUploader
        accept={isVideo ? ["video/mp4", "video/webm"] : ["image/jpeg", "image/png", "image/webp"]}
        aspectRatio={isVideo ? undefined : 16 / 9}
        recommendedDimensions={isVideo ? undefined : { width: 1600, height: 900, label: "Section media: 1600x900px" }}
        folder="cms-sections"
        onUpload={(files: UploadedFile[]) => { if (files[0]) onChange(files[0].url); }}
      />
    </div>
  );
}

function setAtPath(source: unknown, path: Array<string | number>, value: unknown): unknown {
  if (path.length === 0) return value;
  const [head, ...rest] = path;
  if (Array.isArray(source)) {
    return source.map((item, index) => index === head ? setAtPath(item, rest, value) : item);
  }
  const object = isRecord(source) ? source : {};
  return {
    ...object,
    [head]: setAtPath(object[head as string], rest, value),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isMediaKey(value: string): boolean {
  return /(image|img|media|video|logo|poster|url)$/i.test(value) && !/(href|link|slug)$/i.test(value);
}

function humanize(value: string): string {
  return value
    .replace(/\[\d+\]/g, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
