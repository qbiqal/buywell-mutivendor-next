import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { blogPosts, blogCategories, users } from "@/lib/db/schema";
import { eq, and, desc, ilike, asc } from "drizzle-orm";
import { withCache, CACHE_TTL } from "@/lib/cache";
import { handleApiError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const page    = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit   = Math.min(20, parseInt(searchParams.get("limit") ?? "9"));
    const category = searchParams.get("category");
    const featured = searchParams.get("featured") === "true";
    const offset   = (page - 1) * limit;

    const cacheKey = `query:blog:${category ?? "all"}:${featured}:${page}`;
    const data = await withCache(cacheKey, CACHE_TTL.QUERY, async () => {
      const conditions = [eq(blogPosts.status, "published")];
      if (category) conditions.push(eq(blogPosts.categoryId, category));
      if (featured)  conditions.push(eq(blogPosts.isFeatured, true));

      const rows = await db
        .select({
          id: blogPosts.id, title: blogPosts.title, slug: blogPosts.slug,
          excerpt: blogPosts.excerpt, coverImageUrl: blogPosts.coverImageUrl,
          publishedAt: blogPosts.publishedAt, readTime: blogPosts.readTime,
          viewCount: blogPosts.viewCount, tags: blogPosts.tags,
          categoryId: blogPosts.categoryId,
        })
        .from(blogPosts)
        .where(and(...conditions))
        .orderBy(desc(blogPosts.publishedAt))
        .limit(limit)
        .offset(offset);
      return rows;
    });

    return NextResponse.json({ success: true, data });
  } catch (err) {
    return handleApiError(err);
  }
}
