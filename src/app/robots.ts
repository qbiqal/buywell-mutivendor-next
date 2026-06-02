import type { MetadataRoute } from "next";
import { getAllSiteConfig } from "@/lib/config";
import { getSeoConfig } from "@/lib/seo";

export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const [seo, seoConfigRaw] = await Promise.all([
    getSeoConfig(),
    getAllSiteConfig("seo"),
  ]);
  const extraDisallow = (seoConfigRaw.seo_robots_extra_disallow ?? "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

  return {
    rules: {
      userAgent: "*",
      allow: seo.indexingEnabled ? ["/", "/home", "/coming-soon", "/shop", "/blog"] : [],
      disallow: seo.indexingEnabled ? [
        "/admin",
        "/api",
        "/checkout",
        "/orders",
        "/profile",
        "/notifications",
        "/login",
        "/register",
        "/forgot-password",
        "/reset-password",
        "/verify-email",
        ...extraDisallow,
      ] : ["/"],
    },
    sitemap: `${seo.baseUrl}/sitemap.xml`,
  };
}
