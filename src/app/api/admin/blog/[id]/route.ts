import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { blogPosts, contentTags } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createAdminGuard } from "@/lib/middleware";
import { handleApiError, NotFoundError } from "@/lib/errors";
import { cacheInvalidate } from "@/lib/cache";
import { requireModuleApi } from "@/lib/modules";
import { sanitizeHtml } from "@/lib/sanitize";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;
    const moduleResult = await requireModuleApi("blog");
    if (moduleResult) return moduleResult;
    const { id } = await params;
    const rows = await db.select().from(blogPosts).where(eq(blogPosts.id, id));
    if (!rows[0]) throw new NotFoundError("Blog post");
    return NextResponse.json({ success: true, data: rows[0] });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;
    const moduleResult = await requireModuleApi("blog");
    if (moduleResult) return moduleResult;
    const { id } = await params;
    const body = await req.json();

    const rows = await db.select().from(blogPosts).where(eq(blogPosts.id, id));
    if (!rows[0]) throw new NotFoundError("Blog post");

    const updates: Partial<typeof rows[0]> = {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.slug !== undefined && { slug: body.slug }),
      ...(body.content !== undefined && { content: sanitizeHtml(body.content) }),
      ...(body.excerpt !== undefined && { excerpt: body.excerpt }),
      ...(body.coverImageUrl !== undefined && { coverImageUrl: body.coverImageUrl }),
      ...(body.categoryId !== undefined && { categoryId: body.categoryId || null }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.metaTitle !== undefined && { metaTitle: nullableText(body.metaTitle) }),
      ...(body.metaDesc !== undefined && { metaDesc: nullableText(body.metaDesc) }),
      ...(body.seoKeywords !== undefined && { seoKeywords: parseList(body.seoKeywords) }),
      ...(body.canonicalUrl !== undefined && { canonicalUrl: nullableText(body.canonicalUrl) }),
      ...(body.ogImageUrl !== undefined && { ogImageUrl: nullableText(body.ogImageUrl) }),
      ...(body.noIndex !== undefined && { noIndex: body.noIndex === true }),
      ...(body.noFollow !== undefined && { noFollow: body.noFollow === true }),
      ...(body.tags !== undefined && { tags: parseList(body.tags) }),
      ...(body.readTime !== undefined && { readTime: parseInt(String(body.readTime || "5"), 10) }),
      ...(body.isFeatured !== undefined && { isFeatured: body.isFeatured }),
      updatedAt: new Date(),
    };
    // Auto-set publishedAt when publishing
    if (body.status === "published" && !rows[0].publishedAt) {
      updates.publishedAt = new Date();
    }

    await db.update(blogPosts).set(updates).where(eq(blogPosts.id, id));
    if (body.tags !== undefined) await ensureTags("blog", parseList(body.tags));
    await cacheInvalidate.blog();

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}

function nullableText(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text ? text : null;
}

function parseList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  return String(value ?? "").split(",").map((item) => item.trim()).filter(Boolean);
}

async function ensureTags(moduleKey: string, names: string[]) {
  for (const name of names) {
    const slug = `${moduleKey}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`.slice(0, 120);
    if (!slug) continue;
    await db.insert(contentTags).values({
      name,
      slug,
      moduleKey,
      color: colorForName(name),
    }).onConflictDoNothing();
  }
}

function colorForName(value: string): string {
  const colors = ["#D97706", "#16A34A", "#2563EB", "#C026D3", "#DC2626", "#0891B2"];
  const sum = Array.from(value).reduce((total, char) => total + char.charCodeAt(0), 0);
  return colors[sum % colors.length];
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;
    const moduleResult = await requireModuleApi("blog");
    if (moduleResult) return moduleResult;
    const { id } = await params;
    await db.delete(blogPosts).where(eq(blogPosts.id, id));
    await cacheInvalidate.blog();
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
