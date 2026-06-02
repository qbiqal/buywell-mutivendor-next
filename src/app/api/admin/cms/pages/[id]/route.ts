import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import slugify from "slugify";
import { cacheInvalidate } from "@/lib/cache";
import { db } from "@/lib/db";
import { cmsPages } from "@/lib/db/schema";
import { handleApiError, NotFoundError, ValidationError } from "@/lib/errors";
import { createAdminGuard } from "@/lib/middleware";
import { requireModuleApi } from "@/lib/modules";
import { revalidateCmsPaths } from "@/lib/revalidation";
import { sanitizeHtml } from "@/lib/sanitize";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;
    const moduleResult = await requireModuleApi("cms");
    if (moduleResult) return moduleResult;

    const { id } = await params;
    const [page] = await db.select().from(cmsPages).where(eq(cmsPages.id, id)).limit(1);
    if (!page) throw new NotFoundError("CMS page");
    return NextResponse.json({ success: true, data: page });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;
    const moduleResult = await requireModuleApi("cms");
    if (moduleResult) return moduleResult;

    const { id } = await params;
    const [existing] = await db.select().from(cmsPages).where(eq(cmsPages.id, id)).limit(1);
    if (!existing) throw new NotFoundError("CMS page");

    const body = await req.json();
    const status = body.status !== undefined ? normalizeStatus(body.status) : existing.status;
    const title = body.title !== undefined ? String(body.title).trim() : existing.title;
    if (!title) throw new ValidationError("Page title is required");

    const nextSlug = body.slug !== undefined ? normalizeSlug(body.slug) : existing.slug;
    if (!nextSlug) throw new ValidationError("Page slug is required");
    const now = new Date();

    const [page] = await db.update(cmsPages).set({
      title,
      slug: nextSlug,
      excerpt: body.excerpt !== undefined ? nullableText(body.excerpt) : existing.excerpt,
      content: body.content !== undefined ? sanitizeHtml(String(body.content ?? "")) : existing.content,
      status,
      template: body.template !== undefined ? String(body.template || "standard") : existing.template,
      metaTitle: body.metaTitle !== undefined ? nullableText(body.metaTitle) : existing.metaTitle,
      metaDescription: body.metaDescription !== undefined ? nullableText(body.metaDescription) : existing.metaDescription,
      keywords: body.keywords !== undefined ? parseKeywords(body.keywords) : existing.keywords,
      canonicalUrl: body.canonicalUrl !== undefined ? nullableText(body.canonicalUrl) : existing.canonicalUrl,
      ogImageUrl: body.ogImageUrl !== undefined ? nullableText(body.ogImageUrl) : existing.ogImageUrl,
      noIndex: body.noIndex !== undefined ? body.noIndex === true : existing.noIndex,
      noFollow: body.noFollow !== undefined ? body.noFollow === true : existing.noFollow,
      sortOrder: body.sortOrder !== undefined ? parseInt(String(body.sortOrder || "0"), 10) : existing.sortOrder,
      publishedAt: status === "published"
        ? existing.publishedAt ?? now
        : status === "draft"
          ? null
          : existing.publishedAt,
      updatedAt: now,
    }).where(eq(cmsPages.id, id)).returning();

    await cacheInvalidate.cmsPages();
    revalidateCmsPaths([`/${existing.slug}`, `/${page.slug}`]);
    return NextResponse.json({ success: true, data: page });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;
    const moduleResult = await requireModuleApi("cms");
    if (moduleResult) return moduleResult;

    const { id } = await params;
    const [existing] = await db.select().from(cmsPages).where(eq(cmsPages.id, id)).limit(1);
    if (!existing) throw new NotFoundError("CMS page");
    await db.delete(cmsPages).where(eq(cmsPages.id, id));

    await cacheInvalidate.cmsPages();
    revalidateCmsPaths([`/${existing.slug}`]);
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}

function normalizeSlug(value: unknown): string {
  return slugify(String(value ?? ""), { lower: true, strict: true }).slice(0, 120);
}

function normalizeStatus(value: unknown): string {
  const status = String(value ?? "draft");
  return ["draft", "published", "archived"].includes(status) ? status : "draft";
}

function nullableText(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text ? text : null;
}

function parseKeywords(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  return String(value ?? "").split(",").map((item) => item.trim()).filter(Boolean);
}
