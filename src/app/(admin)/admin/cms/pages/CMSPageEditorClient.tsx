"use client";
import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import slugify from "slugify";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { SeoPanel, type SeoPanelValue } from "@/components/admin/SeoPanel";
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
  const [moduleKey, setModuleKey] = useState("cms");
  const [policyType, setPolicyType] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
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
        setModuleKey(page.moduleKey ?? "cms");
        setPolicyType(page.policyType ?? "");
        setMetaTitle(page.metaTitle ?? "");
        setMetaDescription(page.metaDescription ?? "");
        setKeywords(page.keywords ?? []);
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
        moduleKey,
        policyType,
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

  const seoValue: SeoPanelValue = {
    metaTitle,
    metaDescription,
    keywords,
    canonicalUrl,
    ogImageUrl,
    noIndex,
    noFollow,
  };

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
            <Select
              label="Module Visibility"
              value={moduleKey}
              onChange={(e) => setModuleKey(e.target.value)}
              style={{ marginTop: 12 }}
              options={[
                { value: "core", label: "Core" },
                { value: "cms", label: "CMS" },
                { value: "seo", label: "SEO" },
                { value: "blog", label: "Blog" },
                { value: "ecommerce", label: "E-Commerce" },
              ]}
            />
            <Select
              label="Policy Type"
              value={policyType}
              onChange={(e) => setPolicyType(e.target.value)}
              style={{ marginTop: 12 }}
              options={[
                { value: "", label: "Regular CMS page" },
                { value: "terms", label: "Terms and Conditions" },
                { value: "privacy", label: "Privacy Policy" },
                { value: "refund", label: "Refund Policy" },
                { value: "shipping", label: "Shipping Policy" },
                { value: "cookie", label: "Cookie Policy" },
              ]}
            />
            <Input label="Sort Order" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} style={{ marginTop: 12 }} />
          </div>

          <div className={styles.sidePanel}>
            <p className={styles.sectionLabel}>On-page SEO</p>
            <SeoPanel
              value={seoValue}
              titleFallback={title}
              descriptionFallback={excerpt}
              tagModule="cms"
              onChange={(next) => {
                setMetaTitle(next.metaTitle);
                setMetaDescription(next.metaDescription);
                setKeywords(next.keywords);
                setCanonicalUrl(next.canonicalUrl);
                setOgImageUrl(next.ogImageUrl);
                setNoIndex(next.noIndex);
                setNoFollow(next.noFollow);
              }}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
