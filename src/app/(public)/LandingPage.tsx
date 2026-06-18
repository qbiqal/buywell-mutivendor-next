import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { homepageBanners, products, productCategories, testimonials, productImages } from "@/lib/db/schema";
import { eq, and, asc, desc, gt, lt, or, isNull } from "drizzle-orm";
import { withCache, CACHE_TTL } from "@/lib/cache";
import { isModuleEnabled } from "@/lib/modules";
import { HomepageClient } from "./HomepageClient";

export default async function LandingPage() {
  if (!(await isModuleEnabled("cms"))) redirect("/login");

  const now = new Date();

  const [heroBanners, promoBanners, categories, featuredProducts, latestProductsRaw, featuredTestimonials] = await Promise.all([
    withCache("query:cms:banners:hero", CACHE_TTL.QUERY, async () =>
      db.select().from(homepageBanners).where(
        and(
          eq(homepageBanners.isActive, true),
          eq(homepageBanners.bannerType, "hero"),
          or(isNull(homepageBanners.startsAt), lt(homepageBanners.startsAt, now)),
          or(isNull(homepageBanners.endsAt), gt(homepageBanners.endsAt, now)),
        )
      ).orderBy(asc(homepageBanners.sortOrder)).limit(8)
    ),

    withCache("query:cms:banners:promo", CACHE_TTL.QUERY, async () =>
      db.select().from(homepageBanners).where(
        and(
          eq(homepageBanners.isActive, true),
          eq(homepageBanners.bannerType, "promo"),
          or(isNull(homepageBanners.startsAt), lt(homepageBanners.startsAt, now)),
          or(isNull(homepageBanners.endsAt), gt(homepageBanners.endsAt, now)),
        )
      ).orderBy(asc(homepageBanners.sortOrder)).limit(2)
    ),

    withCache("query:categories:active", CACHE_TTL.QUERY, async () =>
      db.select().from(productCategories)
        .where(and(eq(productCategories.isActive, true), isNull(productCategories.parentId)))
        .orderBy(asc(productCategories.sortOrder))
        .limit(12)
    ),

    withCache("query:products:featured", CACHE_TTL.QUERY, async () =>
      db.select({
        id:           products.id,
        name:         products.name,
        slug:         products.slug,
        category:     products.category,
        categoryName: productCategories.name,
        description:  products.description,
        imageUrl:     productImages.url,
      })
      .from(products)
      .leftJoin(productImages, and(eq(productImages.productId, products.id), eq(productImages.isPrimary, true)))
      .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
      .where(and(eq(products.isActive, true), eq(products.isFeatured, true)))
      .orderBy(asc(products.sortOrder))
      .limit(6)
    ),

    withCache("query:products:latest:landing", CACHE_TTL.QUERY, async () => {
      const rows = await db.select({
        id:           products.id,
        name:         products.name,
        slug:         products.slug,
        category:     products.category,
        categoryName: productCategories.name,
        description:  products.description,
        imageUrl:     productImages.url,
      })
      .from(products)
      .leftJoin(productImages, and(eq(productImages.productId, products.id), eq(productImages.isPrimary, true)))
      .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
      .where(eq(products.isActive, true))
      .orderBy(desc(products.createdAt))
      .limit(16);
      const seen = new Set<string>();
      return rows.filter((r) => { if (seen.has(r.id)) return false; seen.add(r.id); return true; });
    }),

    withCache("query:testimonials:featured", CACHE_TTL.QUERY, async () =>
      db.select().from(testimonials)
        .where(and(eq(testimonials.isFeatured, true), eq(testimonials.isApproved, true)))
        .limit(3)
    ),
  ]);

  const baseUrl = "https://buywell.in";

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${baseUrl}/#organization`,
        "name": "BuyWell Marketplace",
        "url": baseUrl,
        "logo": {
          "@type": "ImageObject",
          "url": `${baseUrl}/images/logo.png`,
          "width": 200,
          "height": 60,
        },
        "contactPoint": [
          {
            "@type": "ContactPoint",
            "email": "support@buywell.in",
            "contactType": "customer service",
            "availableLanguage": ["English", "Hindi"],
            "areaServed": "IN",
          }
        ],
        "address": {
          "@type": "PostalAddress",
          "addressLocality": "Kottayam",
          "addressRegion": "Kerala",
          "postalCode": "834005",
          "addressCountry": "IN",
        },
        "sameAs": ["https://qbiqal.com"],
      },
      {
        "@type": "WebSite",
        "@id": `${baseUrl}/#website`,
        "url": baseUrl,
        "name": "BuyWell Marketplace",
        "description": "India's trusted multivendor marketplace — curated products from verified sellers, delivered pan-India.",
        "publisher": { "@id": `${baseUrl}/#organization` },
        "potentialAction": {
          "@type": "SearchAction",
          "target": {
            "@type": "EntryPoint",
            "urlTemplate": `${baseUrl}/shop?search={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomepageClient
        heroBanners={heroBanners}
        promoBanners={promoBanners}
        categories={categories}
        featuredProducts={featuredProducts}
        latestProducts={latestProductsRaw}
        testimonials={featuredTestimonials}
      />
    </>
  );
}
