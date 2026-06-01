import type { Metadata } from "next";
import { db } from "@/lib/db";
import { blogPosts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { requireModulePage } from "@/lib/modules";
import styles from "./blog-detail.module.css";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const rows = await db.select({
    title: blogPosts.title,
    slug: blogPosts.slug,
    excerpt: blogPosts.excerpt,
    metaTitle: blogPosts.metaTitle,
    metaDesc: blogPosts.metaDesc,
    coverImageUrl: blogPosts.coverImageUrl,
  })
    .from(blogPosts).where(and(eq(blogPosts.slug, slug), eq(blogPosts.status, "published")));
  if (!rows[0]) return {};
  const post = rows[0];
  const title = post.metaTitle ?? post.title;
  const description = post.metaDesc ?? post.excerpt ?? undefined;
  return {
    title,
    description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title,
      description,
      type: "article",
      url: `/blog/${post.slug}`,
      images: post.coverImageUrl ? [{ url: post.coverImageUrl, alt: post.title }] : undefined,
    },
    twitter: {
      card: post.coverImageUrl ? "summary_large_image" : "summary",
      title,
      description,
      images: post.coverImageUrl ? [post.coverImageUrl] : undefined,
    },
  };
}

export default async function BlogDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireModulePage("blog");
  const { slug } = await params;
  const rows = await db.select().from(blogPosts).where(and(eq(blogPosts.slug, slug), eq(blogPosts.status, "published")));
  if (!rows[0]) notFound();
  const post = rows[0];

  return (
    <article className={styles.article}>
      {/* Cover */}
      {post.coverImageUrl && (
        <div className={styles.cover}>
          <Image src={post.coverImageUrl} alt={post.title} fill className={styles.coverImg} priority />
          <div className={styles.coverOverlay} />
        </div>
      )}

      <div className={styles.container}>
        {/* Meta */}
        <div className={styles.meta}>
          {post.publishedAt && (
            <time>{new Date(post.publishedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</time>
          )}
          {post.readTime && <span>· {post.readTime} min read</span>}
          {post.viewCount > 0 && <span>· {post.viewCount} views</span>}
        </div>

        {/* Title */}
        <h1 className={styles.title}>{post.title}</h1>
        {post.excerpt && <p className={styles.excerpt}>{post.excerpt}</p>}

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className={styles.tags}>
            {post.tags.map((t) => <span key={t} className={styles.tag}>{t}</span>)}
          </div>
        )}

        {/* Content */}
        <div
          className={styles.content}
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* Back */}
        <div className={styles.backWrap}>
          <Link href="/blog" className={styles.backLink}>← Back to Blog</Link>
        </div>
      </div>
    </article>
  );
}
