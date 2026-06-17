import type { MetadataRoute } from "next";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { blogPosts, products, vendors } from "@/lib/db/schema";
import { getPublishedCmsPages } from "@/lib/cms";
import { getModuleState } from "@/lib/modules";
import { getSeoConfig } from "@/lib/seo";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const seo = await getSeoConfig();
  const baseUrl = seo.baseUrl;
  const now = new Date();
  const policyDate = new Date("2026-06-17");
  const routes: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/home`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
    { url: `${baseUrl}/coming-soon`, lastModified: now, changeFrequency: "monthly", priority: 0.2 },
    { url: `${baseUrl}/become-vendor`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    // Compliance pages
    { url: `${baseUrl}/policies/privacy-policy`, lastModified: policyDate, changeFrequency: "yearly", priority: 0.4 },
    { url: `${baseUrl}/policies/terms-and-conditions`, lastModified: policyDate, changeFrequency: "yearly", priority: 0.4 },
    { url: `${baseUrl}/policies/refund-policy`, lastModified: policyDate, changeFrequency: "yearly", priority: 0.4 },
    { url: `${baseUrl}/policies/shipping-policy`, lastModified: policyDate, changeFrequency: "yearly", priority: 0.4 },
    { url: `${baseUrl}/policies/cancellation-policy`, lastModified: policyDate, changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/policies/cookie-policy`, lastModified: policyDate, changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/policies/data-retention-policy`, lastModified: policyDate, changeFrequency: "yearly", priority: 0.3 },
  ];

  try {
    const modules = await getModuleState();
    if (modules.cms) {
      const pages = await getPublishedCmsPages();
      for (const page of pages) {
        routes.push({
          url: `${baseUrl}/${page.slug}`,
          lastModified: page.updatedAt,
          changeFrequency: "monthly",
          priority: 0.6,
        });
      }
    }

    if (modules.ecommerce) {
      routes.push({ url: `${baseUrl}/shop`, lastModified: now, changeFrequency: "daily", priority: 0.9 });
      
      const productRows = await db.select({
        slug: products.slug,
        updatedAt: products.updatedAt,
      }).from(products)
        .where(eq(products.isActive, true))
        .orderBy(desc(products.updatedAt))
        .limit(500);

      for (const product of productRows) {
        routes.push({
          url: `${baseUrl}/shop/${product.slug}`,
          lastModified: product.updatedAt,
          changeFrequency: "weekly",
          priority: 0.8,
        });
      }

      const vendorRows = await db.select({
        storeSlug: vendors.storeSlug,
        updatedAt: vendors.updatedAt,
      }).from(vendors)
        .where(eq(vendors.status, "approved"))
        .orderBy(desc(vendors.updatedAt))
        .limit(500);

      for (const vendor of vendorRows) {
        routes.push({
          url: `${baseUrl}/vendors/${vendor.storeSlug}`,
          lastModified: vendor.updatedAt,
          changeFrequency: "weekly",
          priority: 0.7,
        });
      }
    }

    if (modules.blog) {
      routes.push({ url: `${baseUrl}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.7 });
      const postRows = await db.select({
        slug: blogPosts.slug,
        updatedAt: blogPosts.updatedAt,
      }).from(blogPosts)
        .where(eq(blogPosts.status, "published"))
        .orderBy(desc(blogPosts.publishedAt))
        .limit(500);

      for (const post of postRows) {
        routes.push({
          url: `${baseUrl}/blog/${post.slug}`,
          lastModified: post.updatedAt,
          changeFrequency: "monthly",
          priority: 0.6,
        });
      }
    }
  } catch {
    return routes;
  }

  return routes;
}
