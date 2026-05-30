import type { Metadata } from "next";
import { db } from "@/lib/db";
import { blogPosts } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { withCache, CACHE_TTL } from "@/lib/cache";
import { getAllSiteConfig } from "@/lib/config";
import BlogListingClient from "./BlogListingClient";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getAllSiteConfig("blog");
  return {
    title: config.blog_title ?? "Blog",
    description: config.blog_subtitle ?? "Stories of purity, tradition & wellness",
  };
}

export default async function BlogPage() {
  const [config, posts] = await Promise.all([
    getAllSiteConfig("blog"),
    withCache("query:blog:published:1", CACHE_TTL.QUERY, async () =>
      db.select({
        id: blogPosts.id, title: blogPosts.title, slug: blogPosts.slug,
        excerpt: blogPosts.excerpt, coverImageUrl: blogPosts.coverImageUrl,
        publishedAt: blogPosts.publishedAt, readTime: blogPosts.readTime,
        viewCount: blogPosts.viewCount, tags: blogPosts.tags,
      })
      .from(blogPosts)
      .where(eq(blogPosts.status, "published"))
      .orderBy(desc(blogPosts.publishedAt))
      .limit(9)
    ),
  ]);

  return <BlogListingClient posts={posts} config={config} />;
}
