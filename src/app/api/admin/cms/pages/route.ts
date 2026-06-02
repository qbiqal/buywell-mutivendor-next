import { NextRequest, NextResponse } from "next/server";
import { asc, desc, eq, ilike, or } from "drizzle-orm";
import slugify from "slugify";
import { cacheInvalidate } from "@/lib/cache";
import { db } from "@/lib/db";
import { cmsPages } from "@/lib/db/schema";
import { handleApiError, ValidationError } from "@/lib/errors";
import { createAdminGuard, getAuthPayload } from "@/lib/middleware";
import { requireModuleApi } from "@/lib/modules";
import { revalidateCmsPaths } from "@/lib/revalidation";
import { sanitizeHtml } from "@/lib/sanitize";

export async function GET(req: NextRequest) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;
    const moduleResult = await requireModuleApi("cms");
    if (moduleResult) return moduleResult;

    const query = req.nextUrl.searchParams.get("search")?.trim() ?? "";
    const status = req.nextUrl.searchParams.get("status")?.trim() ?? "";

    const where = query
      ? or(ilike(cmsPages.title, `%${query}%`), ilike(cmsPages.slug, `%${query}%`))
      : status
        ? eq(cmsPages.status, status)
        : undefined;

    const rows = where
      ? await db.select().from(cmsPages).where(where).orderBy(desc(cmsPages.updatedAt))
      : await db.select().from(cmsPages).orderBy(asc(cmsPages.sortOrder), desc(cmsPages.updatedAt));

    return NextResponse.json({ success: true, data: rows });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;
    const moduleResult = await requireModuleApi("cms");
    if (moduleResult) return moduleResult;
    const payload = await getAuthPayload(req);

    const body = await req.json();
    const title = String(body.title ?? "").trim();
    if (!title) throw new ValidationError("Page title is required");
    const slug = normalizeSlug(body.slug || title);
    if (!slug) throw new ValidationError("Page slug is required");

    const status = normalizeStatus(body.status);
    const now = new Date();
    const [page] = await db.insert(cmsPages).values({
      title,
      slug,
      excerpt: nullableText(body.excerpt),
      content: sanitizeHtml(String(body.content ?? "")),
      status,
      template: String(body.template || "standard"),
      moduleKey: normalizeModuleKey(body.moduleKey),
      policyType: nullableText(body.policyType),
      metaTitle: nullableText(body.metaTitle),
      metaDescription: nullableText(body.metaDescription),
      keywords: parseKeywords(body.keywords),
      canonicalUrl: nullableText(body.canonicalUrl),
      ogImageUrl: nullableText(body.ogImageUrl),
      noIndex: body.noIndex === true,
      noFollow: body.noFollow === true,
      sortOrder: parseInt(String(body.sortOrder ?? "0"), 10),
      createdBy: payload?.sub ?? null,
      publishedAt: status === "published" ? now : null,
    }).returning();

    await cacheInvalidate.cmsPages();
    revalidateCmsPaths([`/${page.slug}`]);
    return NextResponse.json({ success: true, data: page }, { status: 201 });
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

function normalizeModuleKey(value: unknown): string {
  const moduleKey = String(value ?? "cms");
  return ["core", "cms", "seo", "blog", "ecommerce"].includes(moduleKey) ? moduleKey : "cms";
}

function nullableText(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text ? text : null;
}

function parseKeywords(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  return String(value ?? "").split(",").map((item) => item.trim()).filter(Boolean);
}
