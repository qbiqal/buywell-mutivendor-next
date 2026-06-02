import { NextRequest, NextResponse } from "next/server";
import { asc, desc, eq } from "drizzle-orm";
import { cacheInvalidate } from "@/lib/cache";
import { getAllSiteConfig, setSiteConfig } from "@/lib/config";
import { db } from "@/lib/db";
import { seoInternalLinks, seoPageOverrides, seoSearchSubmissions } from "@/lib/db/schema";
import { handleApiError, NotFoundError, ValidationError } from "@/lib/errors";
import { createAdminGuard } from "@/lib/middleware";
import { requireModuleApi } from "@/lib/modules";
import { revalidateSiteShell } from "@/lib/revalidation";
import { getBaseUrl } from "@/lib/seo";

const SEO_SETTING_KEYS = new Set([
  "seo_default_title",
  "seo_title_template",
  "seo_default_description",
  "seo_default_keywords",
  "seo_canonical_base_url",
  "seo_default_og_image_url",
  "seo_indexing_enabled",
  "seo_google_site_verification",
  "seo_bing_site_verification",
  "seo_yandex_site_verification",
  "seo_gtm_id",
  "seo_ga_measurement_id",
  "seo_meta_pixel_id",
  "seo_first_party_analytics_enabled",
  "seo_robots_extra_disallow",
  "seo_sitemap_change_frequency",
  "seo_sitemap_priority_default",
  "seo_submission_google_endpoint",
  "seo_submission_bing_endpoint",
]);

export async function GET(req: NextRequest) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;
    const moduleResult = await requireModuleApi("seo");
    if (moduleResult) return moduleResult;

    const [config, overrides, internalLinks, submissions] = await Promise.all([
      getAllSiteConfig("seo"),
      db.select().from(seoPageOverrides).orderBy(asc(seoPageOverrides.routePath)),
      db.select().from(seoInternalLinks).orderBy(asc(seoInternalLinks.sortOrder), asc(seoInternalLinks.anchorText)),
      db.select().from(seoSearchSubmissions).orderBy(desc(seoSearchSubmissions.createdAt)).limit(30),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        config,
        overrides,
        internalLinks,
        submissions,
        sitemapUrl: `${getBaseUrl()}/sitemap.xml`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;
    const moduleResult = await requireModuleApi("seo");
    if (moduleResult) return moduleResult;

    const body = await req.json();
    if (body.settings) await saveSettings(body.settings);
    if (body.override) await saveOverride(body.override);
    if (body.internalLink) await saveInternalLink(body.internalLink);
    if (body.deleteOverrideId) await deleteOverride(String(body.deleteOverrideId));
    if (body.deleteInternalLinkId) await deleteInternalLink(String(body.deleteInternalLinkId));

    await Promise.all([cacheInvalidate.seo(), cacheInvalidate.config()]);
    revalidateSiteShell();
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;
    const moduleResult = await requireModuleApi("seo");
    if (moduleResult) return moduleResult;

    const body = await req.json();
    const engine = String(body.engine ?? "").trim().toLowerCase();
    if (!engine) throw new ValidationError("Search engine is required");
    const endpoint = nullableText(body.endpoint);
    const sitemapUrl = nullableText(body.sitemapUrl) || `${getBaseUrl()}/sitemap.xml`;

    const [submission] = await db.insert(seoSearchSubmissions).values({
      engine,
      endpoint,
      sitemapUrl,
      status: "submitted",
      response: "Submission recorded in admin. Use Search Console/Bing Webmaster Tools for verified indexing status.",
      submittedAt: new Date(),
    }).returning();

    await cacheInvalidate.seo();
    return NextResponse.json({ success: true, data: submission }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

async function saveSettings(settings: Record<string, unknown>) {
  for (const [key, value] of Object.entries(settings)) {
    if (!SEO_SETTING_KEYS.has(key)) throw new ValidationError(`Unsupported SEO setting: ${key}`);
    await setSiteConfig(key, String(value ?? ""), "seo");
  }
}

async function saveOverride(input: Record<string, unknown>) {
  const routePath = normalizePath(input.routePath);
  if (!routePath) throw new ValidationError("Route path is required");

  await db.insert(seoPageOverrides).values({
    routePath,
    title: nullableText(input.title),
    description: nullableText(input.description),
    keywords: parseKeywords(input.keywords),
    canonicalUrl: nullableText(input.canonicalUrl),
    ogImageUrl: nullableText(input.ogImageUrl),
    robots: String(input.robots || "index,follow"),
    structuredData: parseJson(input.structuredData),
  }).onConflictDoUpdate({
    target: seoPageOverrides.routePath,
    set: {
      title: nullableText(input.title),
      description: nullableText(input.description),
      keywords: parseKeywords(input.keywords),
      canonicalUrl: nullableText(input.canonicalUrl),
      ogImageUrl: nullableText(input.ogImageUrl),
      robots: String(input.robots || "index,follow"),
      structuredData: parseJson(input.structuredData),
      updatedAt: new Date(),
    },
  });
}

async function saveInternalLink(input: Record<string, unknown>) {
  const id = nullableText(input.id);
  const values = {
    sourcePath: normalizePath(input.sourcePath),
    targetPath: normalizePath(input.targetPath),
    anchorText: String(input.anchorText ?? "").trim(),
    context: nullableText(input.context),
    isEnabled: input.isEnabled !== false,
    sortOrder: parseInt(String(input.sortOrder ?? "0"), 10),
    updatedAt: new Date(),
  };
  if (!values.sourcePath || !values.targetPath || !values.anchorText) {
    throw new ValidationError("Source path, target path, and anchor text are required");
  }

  if (id) {
    const [existing] = await db.select().from(seoInternalLinks).where(eq(seoInternalLinks.id, id)).limit(1);
    if (!existing) throw new NotFoundError("Internal link");
    await db.update(seoInternalLinks).set(values).where(eq(seoInternalLinks.id, id));
  } else {
    await db.insert(seoInternalLinks).values(values);
  }
}

async function deleteOverride(id: string) {
  await db.delete(seoPageOverrides).where(eq(seoPageOverrides.id, id));
}

async function deleteInternalLink(id: string) {
  await db.delete(seoInternalLinks).where(eq(seoInternalLinks.id, id));
}

function normalizePath(value: unknown): string {
  const text = String(value ?? "").trim();
  if (!text) return "";
  if (/^https?:\/\//i.test(text)) return text;
  return text.startsWith("/") ? text : `/${text}`;
}

function nullableText(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text ? text : null;
}

function parseKeywords(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  return String(value ?? "").split(",").map((item) => item.trim()).filter(Boolean);
}

function parseJson(value: unknown): unknown {
  if (!value) return null;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new ValidationError("Structured data must be valid JSON");
  }
}
