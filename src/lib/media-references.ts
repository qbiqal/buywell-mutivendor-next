import { eq, ilike, sql } from "drizzle-orm";
import { db } from "./db";
import { blogPosts, cmsSections, productImages, siteConfig } from "./db/schema";

export interface MediaReference {
  type: "product" | "blog" | "cms" | "config";
  label: string;
  href?: string;
}

export async function findMediaReferences(url: string): Promise<MediaReference[]> {
  const [productRows, blogCoverRows, blogContentRows, cmsRows, configRows] = await Promise.all([
    db
      .select({
        productId: productImages.productId,
        alt: productImages.alt,
      })
      .from(productImages)
      .where(eq(productImages.url, url)),
    db
      .select({
        id: blogPosts.id,
        title: blogPosts.title,
      })
      .from(blogPosts)
      .where(eq(blogPosts.coverImageUrl, url)),
    db
      .select({
        id: blogPosts.id,
        title: blogPosts.title,
      })
      .from(blogPosts)
      .where(ilike(blogPosts.content, `%${url}%`)),
    db
      .select({
        sectionKey: cmsSections.sectionKey,
      })
      .from(cmsSections)
      .where(sql`${cmsSections.config}::text like ${`%${url}%`}`),
    db
      .select({
        key: siteConfig.key,
        label: siteConfig.label,
      })
      .from(siteConfig)
      .where(eq(siteConfig.value, url)),
  ]);

  return [
    ...productRows.map((row) => ({
      type: "product" as const,
      label: row.alt ? `Product image: ${row.alt}` : "Product image",
      href: `/admin/products/${row.productId}/edit`,
    })),
    ...blogCoverRows.map((row) => ({
      type: "blog" as const,
      label: `Blog cover: ${row.title}`,
      href: `/admin/blog/${row.id}/edit`,
    })),
    ...blogContentRows.map((row) => ({
      type: "blog" as const,
      label: `Blog content: ${row.title}`,
      href: `/admin/blog/${row.id}/edit`,
    })),
    ...cmsRows.map((row) => ({
      type: "cms" as const,
      label: `CMS section: ${row.sectionKey}`,
      href: "/admin/cms",
    })),
    ...configRows.map((row) => ({
      type: "config" as const,
      label: row.label ?? `Config: ${row.key}`,
      href: "/admin/settings",
    })),
  ];
}
