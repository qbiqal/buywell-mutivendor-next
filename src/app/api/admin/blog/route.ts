import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { blogPosts, blogCategories } from "@/lib/db/schema";
import { eq, desc, and, ilike, or, gte, lte, type SQL } from "drizzle-orm";
import { createAdminGuard, getAuthPayload } from "@/lib/middleware";
import { handleApiError, ValidationError } from "@/lib/errors";
import { cacheInvalidate } from "@/lib/cache";
import slugify from "slugify";
import { requireModuleApi } from "@/lib/modules";
import { sanitizeHtml } from "@/lib/sanitize";

function numberParam(value: string | null) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(req: NextRequest) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;
    const moduleResult = await requireModuleApi("blog");
    if (moduleResult) return moduleResult;

    const { searchParams } = req.nextUrl;
    const status      = searchParams.get("status");
    const search      = searchParams.get("search");
    const categoryId  = searchParams.get("categoryId");
    const featured    = searchParams.get("featured");
    const dateFrom    = searchParams.get("dateFrom");
    const dateTo      = searchParams.get("dateTo");
    const minViews    = numberParam(searchParams.get("minViews"));
    const maxViews    = numberParam(searchParams.get("maxViews"));
    const minReadTime = numberParam(searchParams.get("minReadTime"));
    const maxReadTime = numberParam(searchParams.get("maxReadTime"));

    const conditions: SQL[] = [];
    if (status) conditions.push(eq(blogPosts.status, status));
    if (categoryId) conditions.push(eq(blogPosts.categoryId, categoryId));
    if (featured === "true" || featured === "false") conditions.push(eq(blogPosts.isFeatured, featured === "true"));
    if (dateFrom) conditions.push(gte(blogPosts.createdAt, new Date(dateFrom)));
    if (dateTo) conditions.push(lte(blogPosts.createdAt, new Date(`${dateTo}T23:59:59.999Z`)));
    if (minViews !== null) conditions.push(gte(blogPosts.viewCount, minViews));
    if (maxViews !== null) conditions.push(lte(blogPosts.viewCount, maxViews));
    if (minReadTime !== null) conditions.push(gte(blogPosts.readTime, minReadTime));
    if (maxReadTime !== null) conditions.push(lte(blogPosts.readTime, maxReadTime));
    if (search) {
      const like = `%${search}%`;
      conditions.push(or(
        ilike(blogPosts.title, like),
        ilike(blogPosts.slug, like),
        ilike(blogPosts.excerpt, like),
        ilike(blogPosts.metaDesc, like),
      )!);
    }

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
    const moduleResult = await requireModuleApi("blog");
    if (moduleResult) return moduleResult;

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
      title, slug, content: sanitizeHtml(content), excerpt, coverImageUrl, categoryId,
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
