"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
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
  const [configJson, setConfigJson] = useState("{}");
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
        setConfigJson(JSON.stringify(json.data.config ?? {}, null, 2));
      })
      .finally(() => setLoading(false));
  }, [sectionKey, showError]);

  async function save() {
    if (!section) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(configJson || "{}");
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
          Upload homepage images or videos in <a href="/admin/media">Media Library</a>, copy the generated URL, then paste it into this JSON config. Landing media fields use keys such as <code>videoUrl</code>, <code>imageUrl</code>, <code>images</code>, <code>items[].img</code>, and <code>items[].mediaUrl</code>.
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
        <Textarea
          label="Section Config JSON"
          value={configJson}
          onChange={(e) => setConfigJson(e.target.value)}
          rows={18}
          className={styles.codeArea}
          spellCheck={false}
        />
        <div className={styles.actions}>
          <Button variant="outline" onClick={() => setConfigJson(JSON.stringify(section.config ?? {}, null, 2))}>Reset</Button>
          <Button variant="primary" loading={saving} onClick={save}>Save Section</Button>
        </div>
      </div>
    </div>
  );
}
