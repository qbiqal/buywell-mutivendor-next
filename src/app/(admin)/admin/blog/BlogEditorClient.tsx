"use client";
/**
 * Blog Editor — used for both new and edit flows.
 * Rich text editing via contenteditable + toolbar.
 * Cover image via MediaUploader (16:9, 1600x900 recommended).
 */
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { MediaUploader } from "@/components/media/MediaUploader";
import { NestedCategoryPicker } from "@/components/admin/NestedCategoryPicker";
import { SeoPanel, type SeoPanelValue } from "@/components/admin/SeoPanel";
import { TagSelector } from "@/components/admin/TagSelector";
import { useToast } from "@/components/ui/Toast";
import type { BlogPost } from "@/lib/db/schema";
import styles from "./blog-editor.module.css";

interface BlogEditorProps {
  postId?: string;
}

const STATUS_OPTS = [
  { value: "draft",     label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived",  label: "Archived" },
];

export default function BlogEditorClient({ postId }: BlogEditorProps) {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const editorRef = useRef<HTMLDivElement>(null);

  const [title,         setTitle]         = useState("");
  const [excerpt,       setExcerpt]       = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [categoryId,    setCategoryId]    = useState("");
  const [status,        setStatus]        = useState("draft");
  const [metaTitle,     setMetaTitle]     = useState("");
  const [metaDesc,      setMetaDesc]      = useState("");
  const [seoKeywords,   setSeoKeywords]   = useState<string[]>([]);
  const [canonicalUrl,  setCanonicalUrl]  = useState("");
  const [ogImageUrl,    setOgImageUrl]    = useState("");
  const [noIndex,       setNoIndex]       = useState(false);
  const [noFollow,      setNoFollow]      = useState(false);
  const [tags,          setTags]          = useState<string[]>([]);
  const [readTime,      setReadTime]      = useState("5");
  const [isFeatured,    setIsFeatured]    = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [loading,       setLoading]       = useState(!!postId);

  useEffect(() => {
    if (!postId) return;
    fetch(`/api/admin/blog/${postId}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) return;
        const p: BlogPost = d.data;
        setTitle(p.title);
        setExcerpt(p.excerpt ?? "");
        setCoverImageUrl(p.coverImageUrl ?? "");
        setCategoryId(p.categoryId ?? "");
        setStatus(p.status);
        setMetaTitle(p.metaTitle ?? "");
        setMetaDesc(p.metaDesc ?? "");
        setSeoKeywords(p.seoKeywords ?? []);
        setCanonicalUrl(p.canonicalUrl ?? "");
        setOgImageUrl(p.ogImageUrl ?? "");
        setNoIndex(p.noIndex ?? false);
        setNoFollow(p.noFollow ?? false);
        setTags(p.tags ?? []);
        setReadTime(String(p.readTime ?? 5));
        setIsFeatured(p.isFeatured);
        if (editorRef.current) editorRef.current.innerHTML = p.content;
      })
      .finally(() => setLoading(false));
  }, [postId]);

  function formatText(command: string, value?: string) {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  }

  async function handleSave(saveStatus = status) {
    const content = editorRef.current?.innerHTML ?? "";
    if (!title.trim()) { showError("Title is required"); return; }
    if (!content.trim()) { showError("Content is required"); return; }

    setSaving(true);
    try {
      const body = {
        title, content, excerpt, coverImageUrl, categoryId: categoryId || null, status: saveStatus,
        metaTitle, metaDesc, seoKeywords, canonicalUrl, ogImageUrl, noIndex, noFollow,
        readTime: parseInt(readTime), isFeatured, tags,
      };

      const res = postId
        ? await fetch(`/api/admin/blog/${postId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        : await fetch("/api/admin/blog", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

      const data = await res.json();
      if (!data.success) { showError(data.error ?? "Save failed"); return; }
      success(postId ? "Post updated!" : "Post created!");
      router.push("/admin/blog");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;

  const seoValue: SeoPanelValue = {
    metaTitle,
    metaDescription: metaDesc,
    keywords: seoKeywords,
    canonicalUrl,
    ogImageUrl,
    noIndex,
    noFollow,
  };

  return (
    <div className={styles.editor}>
      <div className={styles.toolbar}>
        <button onClick={() => router.back()} className={styles.backBtn}>← Back</button>
        <h1 className={styles.editorTitle}>{postId ? "Edit Post" : "New Blog Post"}</h1>
        <div className={styles.toolbarActions}>
          <Button variant="ghost" size="sm" loading={saving} onClick={() => handleSave("draft")}>Save Draft</Button>
          <Button variant="primary" size="sm" loading={saving} onClick={() => handleSave("published")}>Publish</Button>
        </div>
      </div>

      <div className={styles.layout}>
        {/* Main content */}
        <div className={styles.main}>
          <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Post title..." className={styles.titleInput} />

          {/* Cover image */}
          <div className={styles.section}>
            <label className={styles.sectionLabel}>Cover Image</label>
            {coverImageUrl && (
              <div className={styles.coverPreview}>
                <img src={coverImageUrl} alt="Cover" style={{ width: "100%", height: 200, objectFit: "cover", borderRadius: 8 }} />
                <button onClick={() => setCoverImageUrl("")} className={styles.removeCover}>✕ Remove</button>
              </div>
            )}
            <MediaUploader
              accept={["image/jpeg", "image/png", "image/webp"]}
              aspectRatio={16 / 9}
              recommendedDimensions={{ width: 1600, height: 900, label: "Cover image: 1600×900px (16:9)" }}
              folder="blog"
              onUpload={(files) => { if (files[0]) setCoverImageUrl(files[0].url); }}
            />
          </div>

          {/* Rich text editor */}
          <div className={styles.section}>
            <label className={styles.sectionLabel}>Content</label>
            {/* Toolbar */}
            <div className={styles.rtToolbar}>
              {[
                { label: "B", cmd: "bold",        title: "Bold" },
                { label: "I", cmd: "italic",      title: "Italic" },
                { label: "U", cmd: "underline",   title: "Underline" },
                { label: "H2", cmd: "formatBlock", val: "h2", title: "Heading 2" },
                { label: "H3", cmd: "formatBlock", val: "h3", title: "Heading 3" },
                { label: "•",  cmd: "insertUnorderedList", title: "Bullet List" },
                { label: "1.", cmd: "insertOrderedList",   title: "Numbered List" },
                { label: "⁠—⁠", cmd: "insertHorizontalRule", title: "Divider" },
              ].map((btn) => (
                <button key={btn.cmd + (btn.val ?? "")} title={btn.title} className={styles.rtBtn}
                  onMouseDown={(e) => { e.preventDefault(); formatText(btn.cmd, btn.val); }}>
                  {btn.label}
                </button>
              ))}
            </div>
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              className={styles.rtEditor}
              data-placeholder="Write your blog post content here..."
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className={styles.sidebar}>
          <div className={styles.sideCard}>
            <label className={styles.sectionLabel}>Status</label>
            <Select value={status} onChange={(e) => setStatus(e.target.value)} options={STATUS_OPTS} />
            <div style={{ marginTop: 12 }}>
              <NestedCategoryPicker
                endpoint="/api/admin/blog/categories"
                value={categoryId}
                onChange={setCategoryId}
                label="Nested Blog Category"
                emptyLabel="Uncategorized"
                defaultColor="#D97706"
              />
            </div>

            <div style={{ marginTop: 12 }}>
              <label className={styles.checkLabel}>
                <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} />
                Featured post
              </label>
            </div>
          </div>

          <div className={styles.sideCard}>
            <Input label="Excerpt" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder="Short summary..." />
            <div style={{ marginTop: 12 }}>
              <TagSelector moduleKey="blog" value={tags} onChange={setTags} label="SEO Tags" placeholder="Search or create blog tags" />
            </div>
            <Input label="Read Time (minutes)" type="number" value={readTime} onChange={(e) => setReadTime(e.target.value)} style={{ marginTop: 12 }} />
          </div>

          <div className={styles.sideCard}>
            <p className={styles.sectionLabel}>SEO</p>
            <SeoPanel
              value={seoValue}
              titleFallback={title}
              descriptionFallback={excerpt}
              tagModule="blog"
              onChange={(next) => {
                setMetaTitle(next.metaTitle);
                setMetaDesc(next.metaDescription);
                setSeoKeywords(next.keywords);
                setCanonicalUrl(next.canonicalUrl);
                setOgImageUrl(next.ogImageUrl);
                setNoIndex(next.noIndex);
                setNoFollow(next.noFollow);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
