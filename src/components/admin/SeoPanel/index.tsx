"use client";

import React from "react";
import { Input, Textarea } from "@/components/ui/Input";
import { MediaUploader, type UploadedFile } from "@/components/media/MediaUploader";
import { TagSelector } from "@/components/admin/TagSelector";
import styles from "./SeoPanel.module.css";

export interface SeoPanelValue {
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  canonicalUrl: string;
  ogImageUrl: string;
  noIndex: boolean;
  noFollow: boolean;
}

interface SeoPanelProps {
  value: SeoPanelValue;
  onChange: (value: SeoPanelValue) => void;
  titleFallback?: string;
  descriptionFallback?: string;
  tagModule?: "blog" | "product" | "cms" | "seo";
}

export function SeoPanel({
  value,
  onChange,
  titleFallback,
  descriptionFallback,
  tagModule = "seo",
}: SeoPanelProps) {
  function set<K extends keyof SeoPanelValue>(key: K, next: SeoPanelValue[K]) {
    onChange({ ...value, [key]: next });
  }

  const titleText = value.metaTitle || titleFallback || "";
  const descText = value.metaDescription || descriptionFallback || "";

  return (
    <div className={styles.panel}>
      <div className={styles.preview}>
        <p className={styles.previewTitle}>{titleText || "Search title preview"}</p>
        <p className={styles.previewUrl}>{value.canonicalUrl || "/page-url"}</p>
        <p className={styles.previewDesc}>{descText || "Search description preview appears here as the page is optimized."}</p>
      </div>

      <Input
        label={`Meta Title (${titleText.length}/60)`}
        value={value.metaTitle}
        onChange={(event) => set("metaTitle", event.target.value)}
        placeholder={titleFallback || "Search title"}
      />
      <Textarea
        label={`Meta Description (${descText.length}/160)`}
        value={value.metaDescription}
        onChange={(event) => set("metaDescription", event.target.value)}
        rows={3}
        placeholder={descriptionFallback || "Search result description"}
      />
      <TagSelector
        moduleKey={tagModule}
        label="SEO Keywords"
        value={value.keywords}
        onChange={(tags) => set("keywords", tags)}
        placeholder="Search or create SEO keywords"
      />
      <Input
        label="Canonical URL"
        value={value.canonicalUrl}
        onChange={(event) => set("canonicalUrl", event.target.value)}
        placeholder="/canonical-path"
      />

      <div className={styles.mediaBlock}>
        <p className={styles.sectionLabel}>Open Graph Image</p>
        {value.ogImageUrl && (
          <div className={styles.imagePreview}>
            <img src={value.ogImageUrl} alt="Open Graph preview" />
            <button type="button" onClick={() => set("ogImageUrl", "")}>x</button>
          </div>
        )}
        <MediaUploader
          accept={["image/jpeg", "image/png", "image/webp"]}
          aspectRatio={1200 / 630}
          recommendedDimensions={{ width: 1200, height: 630, label: "Open Graph: 1200x630px" }}
          folder="seo"
          onUpload={(files: UploadedFile[]) => { if (files[0]) set("ogImageUrl", files[0].url); }}
        />
      </div>

      <div className={styles.flags}>
        <label><input type="checkbox" checked={value.noIndex} onChange={(event) => set("noIndex", event.target.checked)} /> No index</label>
        <label><input type="checkbox" checked={value.noFollow} onChange={(event) => set("noFollow", event.target.checked)} /> No follow</label>
      </div>
    </div>
  );
}
