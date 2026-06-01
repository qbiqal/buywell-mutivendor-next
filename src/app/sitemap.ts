import type { MetadataRoute } from "next";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { blogPosts, products } from "@/lib/db/schema";
import { getModuleState } from "@/lib/modules";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl();
  const now = new Date();
  const routes: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/home`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
    { url: `${baseUrl}/coming-soon`, lastModified: now, changeFrequency: "monthly", priority: 0.2 },
  ];

  try {
    const modules = await getModuleState();

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

function getBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL || "https://aprasnaturals.com";
  return raw.replace(/\/$/, "");
}
