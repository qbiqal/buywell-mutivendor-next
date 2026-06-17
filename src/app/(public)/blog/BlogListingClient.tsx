"use client";
import React from "react";
import Link from "next/link";
import Image from "next/image";
import styles from "./blog.module.css";

interface Post {
  id: string; title: string; slug: string;
  excerpt: string | null; coverImageUrl: string | null;
  publishedAt: Date | null; readTime: number | null; viewCount: number;
  tags: string[] | null;
}

interface BlogListingClientProps {
  posts:  Post[];
  config: Record<string, string>;
}

export default function BlogListingClient({ posts, config }: BlogListingClientProps) {
  const title    = config.blog_title    ?? "BuyWell Marketplace Journal";
  const subtitle = config.blog_subtitle ?? "Stories of purity, tradition & wellness";
  const layout   = config.blog_layout   ?? "grid";

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.container}>
          <p className="eyebrow">Our Blog</p>
          <h1 className="section-title serif">{title}</h1>
          <p className="section-lead">{subtitle}</p>
        </div>
      </div>

      <div className={styles.container}>
        {posts.length === 0 ? (
          <div className={styles.empty}><p>No blog posts published yet. Check back soon!</p></div>
        ) : layout === "list" ? (
          <div className={styles.listView}>
            {posts.map((post) => (
              <Link key={post.id} href={`/blog/${post.slug}`} className={styles.listItem}>
                {post.coverImageUrl && (
                  <div className={styles.listImg}>
                    <Image src={post.coverImageUrl} alt={post.title} fill style={{ objectFit: "cover" }} />
                  </div>
                )}
                <div className={styles.listBody}>
                  <p className={styles.postMeta}>
                    {post.publishedAt && new Date(post.publishedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                    {post.readTime && ` · ${post.readTime} min read`}
                  </p>
                  <h2 className={styles.postTitle}>{post.title}</h2>
                  {post.excerpt && <p className={styles.postExcerpt}>{post.excerpt}</p>}
                  <p className={styles.readMore}>Read More →</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className={styles.grid}>
            {posts.map((post) => (
              <Link key={post.id} href={`/blog/${post.slug}`} className={styles.blogCard}>
                <div className={styles.cardImg}>
                  {post.coverImageUrl ? (
                    <Image src={post.coverImageUrl} alt={post.title} fill style={{ objectFit: "cover" }} />
                  ) : <div className={styles.imgPlaceholder}>📝</div>}
                </div>
                <div className={styles.cardBody}>
                  <p className={styles.postMeta}>
                    {post.publishedAt && new Date(post.publishedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    {post.readTime && ` · ${post.readTime} min`}
                  </p>
                  <h2 className={styles.cardTitle}>{post.title}</h2>
                  {post.excerpt && <p className={styles.cardExcerpt}>{post.excerpt}</p>}
                  {post.tags && post.tags.length > 0 && (
                    <div className={styles.tagRow}>
                      {post.tags.slice(0, 3).map((t) => <span key={t} className={styles.tag}>{t}</span>)}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
