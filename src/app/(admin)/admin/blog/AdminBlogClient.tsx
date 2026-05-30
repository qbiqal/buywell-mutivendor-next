"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import type { BlogPost } from "@/lib/db/schema";
import styles from "./admin-blog.module.css";

type ViewMode = "grid" | "list";

export default function AdminBlogClient() {
  const router  = useRouter();
  const { success, error: showError } = useToast();
  const [posts,   setPosts]   = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [view,    setView]    = useState<ViewMode>("grid");
  const [status,  setStatus]  = useState("");

  useEffect(() => {
    setLoading(true);
    const q = status ? `?status=${status}` : "";
    fetch(`/api/admin/blog${q}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setPosts(d.data); })
      .finally(() => setLoading(false));
  }, [status]);

  async function deletePost(id: string, title: string) {
    if (!confirm(`Delete "${title}"?`)) return;
    const res  = await fetch(`/api/admin/blog/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) { success("Post deleted"); setPosts((p) => p.filter((x) => x.id !== id)); }
    else showError("Delete failed");
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

      {/* Status filters */}
      <div className={styles.filters}>
        {["", "published", "draft", "archived"].map((s) => (
          <button key={s} onClick={() => setStatus(s)} className={[styles.filterBtn, status === s ? styles.filterActive : ""].join(" ")}>
            {s === "" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

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
