import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { cmsSections, products, testimonials, blogPosts } from "@/lib/db/schema";
import { eq, and, asc, desc } from "drizzle-orm";
import { withCache, CACHE_TTL } from "@/lib/cache";
import { getAllSiteConfig } from "@/lib/config";
import { getPublicMenus } from "@/lib/cms";
import { isModuleEnabled } from "@/lib/modules";
import LandingClient from "./LandingClient";

export default async function LandingPage() {
  if (!(await isModuleEnabled("cms"))) redirect("/login");

  const [sections, siteConfig, menus, featuredProducts, featuredTestimonials, recentPosts] = await Promise.all([
    withCache("query:cms:sections:enabled", CACHE_TTL.CONFIG, async () =>
      db.select().from(cmsSections).where(eq(cmsSections.isEnabled, true)).orderBy(asc(cmsSections.sortOrder))
    ),
    getAllSiteConfig("general"),
    getPublicMenus(),
    withCache("query:products:featured", CACHE_TTL.QUERY, async () =>
      db.select().from(products).where(and(eq(products.isActive, true), eq(products.isFeatured, true))).orderBy(asc(products.sortOrder)).limit(3)
    ),
    withCache("query:testimonials:featured", CACHE_TTL.QUERY, async () =>
      db.select().from(testimonials).where(and(eq(testimonials.isFeatured, true), eq(testimonials.isApproved, true))).limit(3)
    ),
    withCache("query:blog:recent", CACHE_TTL.QUERY, async () =>
      db.select({ id: blogPosts.id, title: blogPosts.title, slug: blogPosts.slug, excerpt: blogPosts.excerpt, coverImageUrl: blogPosts.coverImageUrl, publishedAt: blogPosts.publishedAt })
        .from(blogPosts).where(eq(blogPosts.status, "published")).orderBy(desc(blogPosts.publishedAt)).limit(3)
    ),
  ]);

  const sectionMap: Record<string, Record<string, unknown>> = {};
  for (const s of sections) {
    sectionMap[s.sectionKey] = (s.config ?? {}) as Record<string, unknown>;
  }

  return (
    <LandingClient
      sections={sectionMap}
      siteConfig={siteConfig}
      navItems={menus.landing_header}
      featuredProducts={featuredProducts}
      testimonials={featuredTestimonials}
      recentPosts={recentPosts}
    />
  );
}
