"use client";
import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import slugify from "slugify";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { MediaUploader } from "@/components/media/MediaUploader";
import type { UploadedFile } from "@/components/media/MediaUploader";
import { useToast } from "@/components/ui/Toast";
import type { CmsPage } from "@/lib/db/schema";
import styles from "./cms-page-editor.module.css";

interface Props {
  pageId?: string;
}

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

export default function CMSPageEditorClient({ pageId }: Props) {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const editorRef = useRef<HTMLDivElement>(null);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [status, setStatus] = useState("draft");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [keywords, setKeywords] = useState("");
  const [canonicalUrl, setCanonicalUrl] = useState("");
  const [ogImageUrl, setOgImageUrl] = useState("");
  const [noIndex, setNoIndex] = useState(false);
  const [noFollow, setNoFollow] = useState(false);
  const [sortOrder, setSortOrder] = useState("0");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!pageId);

  useEffect(() => {
    if (!pageId) return;
    fetch(`/api/admin/cms/pages/${pageId}`)
      .then((res) => res.json())
      .then((json) => {
        if (!json.success) {
          showError(json.error ?? "Page not found");
          return;
        }
        const page: CmsPage = json.data;
        setTitle(page.title);
        setSlug(page.slug);
        setExcerpt(page.excerpt ?? "");
        setStatus(page.status);
        setMetaTitle(page.metaTitle ?? "");
        setMetaDescription(page.metaDescription ?? "");
        setKeywords((page.keywords ?? []).join(", "));
        setCanonicalUrl(page.canonicalUrl ?? "");
        setOgImageUrl(page.ogImageUrl ?? "");
        setNoIndex(page.noIndex);
        setNoFollow(page.noFollow);
        setSortOrder(String(page.sortOrder ?? 0));
        if (editorRef.current) editorRef.current.innerHTML = page.content;
      })
      .finally(() => setLoading(false));
  }, [pageId, showError]);

  function updateTitle(value: string) {
    setTitle(value);
    if (!pageId && !slug.trim()) setSlug(slugify(value, { lower: true, strict: true }));
  }

  function formatText(command: string, value?: string) {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  }

  async function save(nextStatus = status) {
    const content = editorRef.current?.innerHTML ?? "";
    if (!title.trim()) { showError("Title is required"); return; }
    if (!slug.trim()) { showError("Slug is required"); return; }
    if (!content.trim()) { showError("Content is required"); return; }

    setSaving(true);
    try {
      const body = {
        title,
        slug,
        excerpt,
        content,
        status: nextStatus,
        metaTitle,
        metaDescription,
        keywords,
        canonicalUrl,
        ogImageUrl,
        noIndex,
        noFollow,
        sortOrder: parseInt(sortOrder || "0", 10),
      };
      const res = pageId
        ? await fetch(`/api/admin/cms/pages/${pageId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        : await fetch("/api/admin/cms/pages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!json.success) {
        showError(json.error ?? "Save failed");
        return;
      }
      success(pageId ? "CMS page updated" : "CMS page created");
      router.push("/admin/cms/pages");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className={styles.loading}>Loading...</div>;

  return (
    <div className={styles.editor}>
      <div className={styles.toolbar}>
        <button onClick={() => router.push("/admin/cms/pages")} className={styles.backBtn}>Back</button>
        <h1 className={styles.editorTitle}>{pageId ? "Edit CMS Page" : "New CMS Page"}</h1>
        <div className={styles.toolbarActions}>
          <Button variant="ghost" size="sm" loading={saving} onClick={() => save("draft")}>Save Draft</Button>
          <Button variant="primary" size="sm" loading={saving} onClick={() => save("published")}>Publish</Button>
        </div>
      </div>

      <div className={styles.layout}>
        <div className={styles.main}>
          <Input label="Title" value={title} onChange={(e) => updateTitle(e.target.value)} placeholder="Page title" className={styles.titleInput} />
          <Input label="Slug" value={slug} onChange={(e) => setSlug(slugify(e.target.value, { lower: true, strict: true }))} placeholder="about-us" hint={`Public URL: /${slug || "page-slug"}`} />
          <Textarea label="Excerpt" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={3} placeholder="Short page summary for cards and SEO fallback" />

          <div className={styles.section}>
            <label className={styles.sectionLabel}>Content</label>
            <div className={styles.rtToolbar}>
              {[
                { label: "B", cmd: "bold", title: "Bold" },
                { label: "I", cmd: "italic", title: "Italic" },
                { label: "H2", cmd: "formatBlock", val: "h2", title: "Heading 2" },
                { label: "H3", cmd: "formatBlock", val: "h3", title: "Heading 3" },
                { label: "List", cmd: "insertUnorderedList", title: "Bullet List" },
                { label: "Numbered", cmd: "insertOrderedList", title: "Numbered List" },
                { label: "Rule", cmd: "insertHorizontalRule", title: "Divider" },
              ].map((btn) => (
                <button
                  key={btn.cmd + (btn.val ?? "")}
                  title={btn.title}
                  className={styles.rtBtn}
                  onMouseDown={(e) => { e.preventDefault(); formatText(btn.cmd, btn.val); }}
                >
                  {btn.label}
                </button>
              ))}
            </div>
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              className={styles.rtEditor}
              data-placeholder="Write the page content here..."
            />
          </div>
        </div>

        <aside className={styles.sidebar}>
          <div className={styles.sidePanel}>
            <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} options={STATUS_OPTIONS} />
            <Input label="Sort Order" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} style={{ marginTop: 12 }} />
          </div>

          <div className={styles.sidePanel}>
            <p className={styles.sectionLabel}>On-page SEO</p>
            <Input label="Meta Title" value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} placeholder={title || "Search title"} />
            <Textarea label="Meta Description" value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} rows={3} placeholder="Search result description" style={{ marginTop: 12 }} />
            <Input label="Keywords" value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="honey, ghee, wellness" style={{ marginTop: 12 }} />
            <Input label="Canonical URL" value={canonicalUrl} onChange={(e) => setCanonicalUrl(e.target.value)} placeholder={`/${slug || "page-slug"}`} style={{ marginTop: 12 }} />
            <div className={styles.checkStack}>
              <label><input type="checkbox" checked={noIndex} onChange={(e) => setNoIndex(e.target.checked)} /> No index</label>
              <label><input type="checkbox" checked={noFollow} onChange={(e) => setNoFollow(e.target.checked)} /> No follow</label>
            </div>
          </div>

          <div className={styles.sidePanel}>
            <p className={styles.sectionLabel}>Open Graph Image</p>
            {ogImageUrl && (
              <div className={styles.imagePreview}>
                <img src={ogImageUrl} alt="Open Graph preview" />
                <button type="button" onClick={() => setOgImageUrl("")}>Remove</button>
              </div>
            )}
            <MediaUploader
              accept={["image/jpeg", "image/png", "image/webp"]}
              aspectRatio={1200 / 630}
              recommendedDimensions={{ width: 1200, height: 630, label: "Open Graph: 1200×630px" }}
              folder="cms-pages"
              onUpload={(files: UploadedFile[]) => { if (files[0]) setOgImageUrl(files[0].url); }}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
