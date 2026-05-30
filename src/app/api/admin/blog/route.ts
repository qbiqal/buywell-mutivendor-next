import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { blogPosts, blogCategories } from "@/lib/db/schema";
import { eq, desc, and, ilike } from "drizzle-orm";
import { createAdminGuard, getAuthPayload } from "@/lib/middleware";
import { handleApiError, ValidationError } from "@/lib/errors";
import { cacheInvalidate } from "@/lib/cache";
import slugify from "slugify";

export async function GET(req: NextRequest) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;

    const { searchParams } = req.nextUrl;
    const status  = searchParams.get("status");
    const search  = searchParams.get("search");

    const conditions: ReturnType<typeof eq>[] = [];
    if (status) conditions.push(eq(blogPosts.status, status) as ReturnType<typeof eq>);
    if (search) conditions.push(ilike(blogPosts.title, `%${search}%`) as ReturnType<typeof eq>);

    const rows = await db.select().from(blogPosts)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(blogPosts.createdAt));

    return NextResponse.json({ success: true, data: rows });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;

    const payload = await getAuthPayload(req);
    const body    = await req.json();
    const { title, content, excerpt, coverImageUrl, categoryId, status, metaTitle, metaDesc, tags, readTime, isFeatured } = body;

    if (!title || !content) throw new ValidationError("Title and content are required");

    const baseSlug = slugify(title, { lower: true, strict: true });
    // Ensure unique slug
    const existing = await db.select({ slug: blogPosts.slug }).from(blogPosts);
    const usedSlugs = new Set(existing.map((r) => r.slug));
    let slug = baseSlug;
    let counter = 2;
    while (usedSlugs.has(slug)) { slug = `${baseSlug}-${counter++}`; }

    const [post] = await db.insert(blogPosts).values({
      title, slug, content, excerpt, coverImageUrl, categoryId,
      status:   status ?? "draft",
      authorId: payload!.sub,
      metaTitle, metaDesc, tags, readTime, isFeatured,
      publishedAt: status === "published" ? new Date() : null,
    }).returning();

    if (status === "published") await cacheInvalidate.blog();

    return NextResponse.json({ success: true, data: post }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
