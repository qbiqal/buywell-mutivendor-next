import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { CACHE_TTL, withCache } from "./cache";
import { getAllSiteConfig } from "./config";
import { db } from "./db";
import { seoPageOverrides } from "./db/schema";

export interface SeoConfig {
  siteName: string;
  defaultTitle: string;
  titleTemplate: string;
  defaultDescription: string;
  keywords: string[];
  baseUrl: string;
  indexingEnabled: boolean;
  defaultOgImageUrl: string;
  googleSiteVerification: string;
  bingSiteVerification: string;
  yandexSiteVerification: string;
  gtmId: string;
  gaMeasurementId: string;
  metaPixelId: string;
  firstPartyAnalyticsEnabled: boolean;
}

export interface SeoMetadataInput {
  title?: string | null;
  description?: string | null;
  keywords?: string[] | null;
  canonicalPath?: string | null;
  canonicalUrl?: string | null;
  ogImageUrl?: string | null;
  noIndex?: boolean;
  noFollow?: boolean;
  type?: "website" | "article";
}

export async function getSeoConfig(): Promise<SeoConfig> {
  const [general, seo] = await Promise.all([
    getAllSiteConfig("general"),
    getAllSiteConfig("seo"),
  ]);

  const baseUrl = (seo.seo_canonical_base_url || process.env.NEXT_PUBLIC_APP_URL || "https://buywell.in").replace(/\/$/, "");
  return {
    siteName: general.site_name || "BuyWell Marketplace",
    defaultTitle: seo.seo_default_title || general.site_name || "BuyWell Marketplace",
    titleTemplate: seo.seo_title_template || "%s | BuyWell Marketplace",
    defaultDescription: seo.seo_default_description || general.site_tagline || "BuyWell Online Shopping India — Fashion, Electronics, Health & More.",
    keywords: csv(seo.seo_default_keywords || "online shopping india,buywell,fashion,electronics,health beauty,home kitchen,best price,fast delivery"),
    baseUrl,
    indexingEnabled: (seo.seo_indexing_enabled ?? "true") !== "false",
    defaultOgImageUrl: seo.seo_default_og_image_url || general.site_logo_url || "",
    googleSiteVerification: seo.seo_google_site_verification || "",
    bingSiteVerification: seo.seo_bing_site_verification || "",
    yandexSiteVerification: seo.seo_yandex_site_verification || "",
    gtmId: normalizeGtmId(seo.seo_gtm_id || ""),
    gaMeasurementId: normalizeGaId(seo.seo_ga_measurement_id || ""),
    metaPixelId: seo.seo_meta_pixel_id || "",
    firstPartyAnalyticsEnabled: (seo.seo_first_party_analytics_enabled ?? "true") !== "false",
  };
}

export async function getSeoOverride(routePath: string) {
  return withCache(`query:seo:override:${routePath}`, CACHE_TTL.CONFIG, async () => {
    const [row] = await db.select().from(seoPageOverrides).where(eq(seoPageOverrides.routePath, routePath)).limit(1);
    return row ?? null;
  });
}

export async function buildSeoMetadata(routePath: string, input: SeoMetadataInput = {}): Promise<Metadata> {
  const [config, override] = await Promise.all([
    getSeoConfig(),
    getSeoOverride(routePath),
  ]);

  const title = override?.title || input.title || config.defaultTitle;
  const description = override?.description || input.description || config.defaultDescription;
  const keywords = override?.keywords?.length ? override.keywords : input.keywords?.length ? input.keywords : config.keywords;
  const robotsValue = override?.robots || robotValue(config.indexingEnabled, input.noIndex, input.noFollow);
  const canonical = override?.canonicalUrl || input.canonicalUrl || absoluteUrl(config.baseUrl, input.canonicalPath ?? routePath);
  const image = override?.ogImageUrl || input.ogImageUrl || config.defaultOgImageUrl;
  const otherVerification: Record<string, string> = {};
  if (config.bingSiteVerification) otherVerification["msvalidate.01"] = config.bingSiteVerification;
  if (config.yandexSiteVerification) otherVerification["yandex-verification"] = config.yandexSiteVerification;

  return {
    metadataBase: new URL(config.baseUrl),
    title: {
      default: title,
      template: config.titleTemplate,
    },
    description,
    keywords,
    alternates: { canonical },
    robots: robotsValue,
    openGraph: {
      title,
      description,
      siteName: config.siteName,
      type: input.type ?? "website",
      url: canonical,
      images: image ? [{ url: image, alt: title }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },
    verification: {
      google: config.googleSiteVerification || undefined,
      other: Object.keys(otherVerification).length > 0 ? otherVerification : undefined,
    },
  };
}

export function absoluteUrl(baseUrl: string, pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${baseUrl}${path}`;
}

export function getBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "https://buywell.in").replace(/\/$/, "");
}

function csv(value: string): string[] {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function robotValue(indexingEnabled: boolean, noIndex?: boolean, noFollow?: boolean): string {
  const index = indexingEnabled && !noIndex ? "index" : "noindex";
  const follow = noFollow ? "nofollow" : "follow";
  return `${index},${follow}`;
}

function normalizeGtmId(value: string): string {
  const trimmed = value.trim();
  return /^GTM-[A-Z0-9]+$/i.test(trimmed) ? trimmed.toUpperCase() : "";
}

function normalizeGaId(value: string): string {
  const trimmed = value.trim();
  return /^G-[A-Z0-9]+$/i.test(trimmed) ? trimmed.toUpperCase() : "";
}
