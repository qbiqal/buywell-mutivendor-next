import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { blogPosts, blogCategories } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { withCache, CACHE_TTL } from "@/lib/cache";
import { handleApiError, NotFoundError } from "@/lib/errors";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const cacheKey = `query:blog:post:${slug}`;

    const data = await withCache(cacheKey, CACHE_TTL.QUERY, async () => {
      const rows = await db
        .select()
        .from(blogPosts)
        .where(and(eq(blogPosts.slug, slug), eq(blogPosts.status, "published")));

      if (!rows[0]) throw new NotFoundError("Blog post");
      return rows[0];
    });

    // Increment view count (fire-and-forget)
    db.update(blogPosts)
      .set({ viewCount: (data.viewCount ?? 0) + 1 })
      .where(eq(blogPosts.id, data.id))
      .catch(() => {});

    return NextResponse.json({ success: true, data });
  } catch (err) {
    return handleApiError(err);
  }
}
