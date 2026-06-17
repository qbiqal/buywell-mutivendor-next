"use client";
import React, { useDeferredValue, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { DataTableFilters } from "@/components/admin/DataTableFilters";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import type { BlogCategory, BlogPost } from "@/lib/db/schema";
import styles from "./admin-blog.module.css";

type ViewMode = "grid" | "list";

export default function AdminBlogClient() {
  const router  = useRouter();
  const { success, error: showError } = useToast();
  const [posts,   setPosts]   = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [view,    setView]    = useState<ViewMode>("grid");
  const [search,  setSearch]  = useState("");
  const [status,  setStatus]  = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [featured, setFeatured] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [minViews, setMinViews] = useState("");
  const [maxViews, setMaxViews] = useState("");
  const [minReadTime, setMinReadTime] = useState("");
  const [maxReadTime, setMaxReadTime] = useState("");
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [categoryForm, setCategoryForm] = useState({ id: "", name: "", slug: "", parentId: "", color: "#D97706", sortOrder: "0" });
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    fetch("/api/admin/blog/categories")
      .then((r) => r.json())
      .then((categoriesJson) => {
        if (categoriesJson.success) setCategories(categoriesJson.data);
      });
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (deferredSearch.trim()) params.set("search", deferredSearch.trim());
    if (status) params.set("status", status);
    if (categoryId) params.set("categoryId", categoryId);
    if (featured) params.set("featured", featured);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (minViews) params.set("minViews", minViews);
    if (maxViews) params.set("maxViews", maxViews);
    if (minReadTime) params.set("minReadTime", minReadTime);
    if (maxReadTime) params.set("maxReadTime", maxReadTime);
    const query = params.toString();

    fetch(`/api/admin/blog${query ? `?${query}` : ""}`)
      .then((r) => r.json())
      .then((postsJson) => {
        if (postsJson.success) setPosts(postsJson.data);
      })
      .finally(() => setLoading(false));
  }, [deferredSearch, status, categoryId, featured, dateFrom, dateTo, minViews, maxViews, minReadTime, maxReadTime]);

  const filterFields = useMemo(() => [
    {
      key: "status",
      label: "Status",
      type: "select" as const,
      value: status,
      onChange: setStatus,
      options: [
        { value: "", label: "All statuses" },
        { value: "published", label: "Published" },
        { value: "draft", label: "Draft" },
        { value: "archived", label: "Archived" },
      ],
    },
    {
      key: "category",
      label: "Category",
      type: "select" as const,
      value: categoryId,
      onChange: setCategoryId,
      options: [
        { value: "", label: "All categories" },
        ...categories.map((category) => ({ value: category.id, label: category.name })),
      ],
    },
    {
      key: "featured",
      label: "Featured",
      type: "select" as const,
      value: featured,
      onChange: setFeatured,
      options: [
        { value: "", label: "All posts" },
        { value: "true", label: "Featured only" },
        { value: "false", label: "Not featured" },
      ],
    },
    { key: "dateFrom", label: "Created from", type: "date" as const, value: dateFrom, onChange: setDateFrom },
    { key: "dateTo", label: "Created to", type: "date" as const, value: dateTo, onChange: setDateTo },
    { key: "minViews", label: "Min views", type: "number" as const, value: minViews, min: 0, onChange: setMinViews },
    { key: "maxViews", label: "Max views", type: "number" as const, value: maxViews, min: 0, onChange: setMaxViews },
    { key: "minReadTime", label: "Min read", type: "number" as const, value: minReadTime, min: 0, onChange: setMinReadTime },
    { key: "maxReadTime", label: "Max read", type: "number" as const, value: maxReadTime, min: 0, onChange: setMaxReadTime },
  ], [categories, categoryId, dateFrom, dateTo, featured, maxReadTime, maxViews, minReadTime, minViews, status]);

  function resetFilters() {
    setSearch("");
    setStatus("");
    setCategoryId("");
    setFeatured("");
    setDateFrom("");
    setDateTo("");
    setMinViews("");
    setMaxViews("");
    setMinReadTime("");
    setMaxReadTime("");
  }

  async function deletePost(id: string, title: string) {
    if (!confirm(`Delete "${title}"?`)) return;
    const res  = await fetch(`/api/admin/blog/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) { success("Post deleted"); setPosts((p) => p.filter((x) => x.id !== id)); }
    else showError("Delete failed");
  }

  async function saveCategory() {
    if (!categoryForm.name.trim()) { showError("Category name is required"); return; }
    const payload = {
      ...categoryForm,
      sortOrder: parseInt(categoryForm.sortOrder || "0", 10),
    };
    const res = await fetch("/api/admin/blog/categories", {
      method: categoryForm.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!data.success) { showError(data.error ?? "Category save failed"); return; }
    success(categoryForm.id ? "Category updated" : "Category created");
    setCategoryForm({ id: "", name: "", slug: "", parentId: "", color: "#D97706", sortOrder: "0" });
    const refreshed = await fetch("/api/admin/blog/categories").then((r) => r.json());
    if (refreshed.success) setCategories(refreshed.data);
  }

  async function deleteCategory(id: string, name: string) {
    if (!confirm(`Delete category "${name}"?`)) return;
    const res = await fetch(`/api/admin/blog/categories?id=${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!data.success) { showError(data.error ?? "Category delete failed"); return; }
    success("Category deleted");
    setCategories((current) => current.filter((category) => category.id !== id));
  }

  return (
    <div className={styles.content}>
      <div className={styles.header}>
        <div>
          <h1 className="admin-page-title">Blog Posts</h1>
          <p className="admin-page-subtitle">Create and manage blog content</p>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.viewToggle}>
            <button className={[styles.viewBtn, view === "grid" ? styles.viewActive : ""].join(" ")} onClick={() => setView("grid")}>⊞ Grid</button>
            <button className={[styles.viewBtn, view === "list" ? styles.viewActive : ""].join(" ")} onClick={() => setView("list")}>≡ List</button>
          </div>
          <Link href="/admin/blog/new"><Button variant="primary">+ New Post</Button></Link>
        </div>
      </div>

      <DataTableFilters
        title="Blog filters"
        subtitle="Search posts and narrow by publishing state, category, date, views, and read time."
        searchValue={search}
        searchPlaceholder="Search title, slug, excerpt, or meta description"
        onSearchChange={setSearch}
        fields={filterFields}
        onReset={resetFilters}
        resultLabel={`${posts.length} ${posts.length === 1 ? "post" : "posts"}`}
        exportFileName="buywell-blog-posts"
        exportRows={posts.map((post) => ({
          title: post.title,
          slug: post.slug,
          status: post.status,
          publishedAt: post.publishedAt ? new Date(post.publishedAt).toISOString() : "",
          views: post.viewCount,
          readTime: post.readTime ?? "",
          tags: (post.tags ?? []).join(", "),
        }))}
      />

      <section className={styles.categoryPanel}>
        <div className={styles.categoryHeader}>
          <h2>Categories</h2>
          {categoryForm.id && <button className={styles.deleteBtn} onClick={() => setCategoryForm({ id: "", name: "", slug: "", parentId: "", color: "#D97706", sortOrder: "0" })}>Cancel edit</button>}
        </div>
        <div className={styles.categoryForm}>
          <input value={categoryForm.name} onChange={(e) => setCategoryForm((p) => ({ ...p, name: e.target.value }))} placeholder="Category name" />
          <input value={categoryForm.slug} onChange={(e) => setCategoryForm((p) => ({ ...p, slug: e.target.value }))} placeholder="slug" />
          <select value={categoryForm.parentId} onChange={(e) => setCategoryForm((p) => ({ ...p, parentId: e.target.value }))}>
            <option value="">Top level</option>
            {categories.filter((category) => category.id !== categoryForm.id).map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
          <input type="color" value={categoryForm.color} onChange={(e) => setCategoryForm((p) => ({ ...p, color: e.target.value }))} aria-label="Category color" />
          <input type="number" value={categoryForm.sortOrder} onChange={(e) => setCategoryForm((p) => ({ ...p, sortOrder: e.target.value }))} placeholder="Sort" />
          <Button variant="outline" size="sm" onClick={saveCategory}>{categoryForm.id ? "Update" : "Add"}</Button>
        </div>
        <div className={styles.categoryList}>
          {categories.map((category) => (
            <div key={category.id} className={styles.categoryItem}>
              <span className={styles.categorySwatch} style={{ background: category.color ?? "#D97706" }} />
              <span>{category.name}</span>
              <small>{category.slug}</small>
              <button className={styles.editLink} onClick={() => setCategoryForm({
                id: category.id,
                name: category.name,
                slug: category.slug,
                parentId: category.parentId ?? "",
                color: category.color ?? "#D97706",
                sortOrder: String(category.sortOrder),
              })}>Edit</button>
              <button className={styles.deleteBtn} onClick={() => deleteCategory(category.id, category.name)}>Delete</button>
            </div>
          ))}
        </div>
      </section>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><Spinner size="lg" /></div>
      ) : posts.length === 0 ? (
        <div className={styles.empty}>
          <p>No blog posts yet.</p>
          <Link href="/admin/blog/new"><Button variant="primary" style={{ marginTop: 12 }}>Create First Post</Button></Link>
        </div>
      ) : view === "grid" ? (
        <div className={styles.grid}>
          {posts.map((post) => (
            <div key={post.id} className={styles.blogCard}>
              <div className={styles.cardCover}>
                {post.coverImageUrl ? (
                  <Image src={post.coverImageUrl} alt={post.title} fill style={{ objectFit: "cover" }} />
                ) : <div className={styles.coverPlaceholder}>📝</div>}
                <Badge statusKey={post.status} className={styles.statusBadge}>{post.status}</Badge>
              </div>
              <div className={styles.cardBody}>
                <p className={styles.cardDate}>{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString("en-IN") : "Draft"}</p>
                <h3 className={styles.cardTitle}>{post.title}</h3>
                <p className={styles.cardExcerpt}>{post.excerpt}</p>
                <div className={styles.cardActions}>
                  <Link href={`/admin/blog/${post.id}/edit`} className={styles.editLink}>✏️ Edit</Link>
                  <button onClick={() => deletePost(post.id, post.title)} className={styles.deleteBtn}>🗑️</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.listView}>
          <table className={styles.table}>
            <thead><tr><th>Title</th><th>Status</th><th>Published</th><th>Views</th><th></th></tr></thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id}>
                  <td className={styles.postTitle}>{post.title}</td>
                  <td><Badge statusKey={post.status}>{post.status}</Badge></td>
                  <td className={styles.date}>{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString("en-IN") : "—"}</td>
                  <td>{post.viewCount}</td>
                  <td>
                    <Link href={`/admin/blog/${post.id}/edit`} className={styles.editLink}>Edit</Link>
                    {" · "}
                    <button onClick={() => deletePost(post.id, post.title)} className={styles.deleteBtn}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
