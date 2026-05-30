/**
 * /home — original full landing page (temporarily accessible here).
 * Will become the root "/" once the site launches.
 */
import { db } from "@/lib/db";
import { cmsSections, products, testimonials, blogPosts } from "@/lib/db/schema";
import { eq, and, asc, desc } from "drizzle-orm";
import { withCache, CACHE_TTL } from "@/lib/cache";
import { getAllSiteConfig } from "@/lib/config";
import LandingClient from "@/app/(public)/LandingClient";
import { CustomerHeader } from "@/components/layout/CustomerHeader";
import { Footer } from "@/components/layout/Footer";
import { getTokenFromCookies, verifyToken } from "@/lib/auth";
import { users } from "@/lib/db/schema";

export const metadata = {
  title: "APRAS Naturals — Pure Prakvedaa Honey & A2 Bilona Ghee",
};

export default async function HomePage() {
  let user = null;
  const token = await getTokenFromCookies();
  if (token) {
    const payload = await verifyToken(token);
    if (payload) {
      const rows = await db.select({ firstName: users.firstName, email: users.email, role: users.role })
        .from(users).where(eq(users.id, payload.sub));
      if (rows[0]) user = rows[0];
    }
  }

  const [sections, siteConfig, featuredProducts, featuredTestimonials, recentPosts] = await Promise.all([
    withCache("query:cms:sections:enabled", CACHE_TTL.CONFIG, async () =>
      db.select().from(cmsSections).where(eq(cmsSections.isEnabled, true)).orderBy(asc(cmsSections.sortOrder))
    ),
    getAllSiteConfig("general"),
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
  for (const s of sections) sectionMap[s.sectionKey] = (s.config ?? {}) as Record<string, unknown>;

  return (
    <>
      <CustomerHeader user={user} />
      <main style={{ paddingTop: "var(--header-height)" }}>
        <LandingClient
          sections={sectionMap}
          siteConfig={siteConfig}
          featuredProducts={featuredProducts}
          testimonials={featuredTestimonials}
          recentPosts={recentPosts}
        />
      </main>
      <Footer />
    </>
  );
}
