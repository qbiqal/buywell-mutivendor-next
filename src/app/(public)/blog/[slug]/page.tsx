import type { Metadata } from "next";
import { db } from "@/lib/db";
import { blogPosts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { requireModulePage } from "@/lib/modules";
import { buildSeoMetadata } from "@/lib/seo";
import { BlogComments } from "./BlogComments";
import styles from "./blog-detail.module.css";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const rows = await db.select({
    title: blogPosts.title,
    slug: blogPosts.slug,
    excerpt: blogPosts.excerpt,
    metaTitle: blogPosts.metaTitle,
    metaDesc: blogPosts.metaDesc,
    seoKeywords: blogPosts.seoKeywords,
    canonicalUrl: blogPosts.canonicalUrl,
    ogImageUrl: blogPosts.ogImageUrl,
    noIndex: blogPosts.noIndex,
    noFollow: blogPosts.noFollow,
    coverImageUrl: blogPosts.coverImageUrl,
  })
    .from(blogPosts).where(and(eq(blogPosts.slug, slug), eq(blogPosts.status, "published")));
  if (!rows[0]) return {};
  const post = rows[0];
  return buildSeoMetadata(`/blog/${post.slug}`, {
    title: post.metaTitle ?? post.title,
    description: post.metaDesc ?? post.excerpt ?? undefined,
    keywords: post.seoKeywords,
    canonicalPath: `/blog/${post.slug}`,
    canonicalUrl: post.canonicalUrl,
    ogImageUrl: post.ogImageUrl ?? post.coverImageUrl,
    noIndex: post.noIndex,
    noFollow: post.noFollow,
  });
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

        <BlogComments slug={post.slug} />

        {/* Back */}
        <div className={styles.backWrap}>
          <Link href="/blog" className={styles.backLink}>← Back to Blog</Link>
        </div>
      </div>
    </article>
  );
}
