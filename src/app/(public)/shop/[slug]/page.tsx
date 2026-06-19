import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { products, productVariants, productImages, vendors, productCategories } from "@/lib/db/schema";
import { eq, and, asc, ne } from "drizzle-orm";
import { withCache, CACHE_TTL } from "@/lib/cache";
import { requireModulePage } from "@/lib/modules";
import { getTokenFromCookies, isAdminRole, verifyToken } from "@/lib/auth";
import { buildSeoMetadata } from "@/lib/seo";
import ProductDetailClient from "./ProductDetailClient";

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      description: products.description,
      metaTitle: products.metaTitle,
      metaDesc: products.metaDesc,
      seoKeywords: products.seoKeywords,
      canonicalUrl: products.canonicalUrl,
      ogImageUrl: products.ogImageUrl,
      noIndex: products.noIndex,
      noFollow: products.noFollow,
      slug: products.slug,
    })
    .from(products)
    .where(and(eq(products.slug, slug), eq(products.isActive, true)));
  if (!rows[0]) return {};
  const p = rows[0];
  const [image] = await db.select({ url: productImages.url, alt: productImages.alt })
    .from(productImages)
    .where(eq(productImages.productId, p.id))
    .orderBy(asc(productImages.sortOrder))
    .limit(1);
  const title = p.metaTitle ?? p.name;
  const description = p.metaDesc ?? p.description ?? undefined;
  return buildSeoMetadata(`/shop/${p.slug}`, {
    title,
    description,
    keywords: p.seoKeywords,
    canonicalPath: `/shop/${p.slug}`,
    canonicalUrl: p.canonicalUrl,
    ogImageUrl: p.ogImageUrl ?? image?.url,
    noIndex: p.noIndex,
    noFollow: p.noFollow,
  });
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireModulePage("ecommerce");
  const { slug } = await params;
  const token = await getTokenFromCookies();
  const payload = token ? await verifyToken(token) : null;
  const canEdit = isAdminRole(payload?.role);

  // Explicit column selection avoids referencing migration-0011 columns that may
  // not yet exist in production (hsnCode, taxRateId, adminRating). A DB column
  // error here would otherwise surface as a generic 500 to the visitor.
  const product = await withCache(`query:product:${slug}`, CACHE_TTL.QUERY, async () => {
    const rows = await db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        category: products.category,
        categoryId: products.categoryId,
        subCategory: products.subCategory,
        description: products.description,
        longDesc: products.longDesc,
        sku: products.sku,
        isActive: products.isActive,
        isFeatured: products.isFeatured,
        sortOrder: products.sortOrder,
        vendorId: products.vendorId,
        tags: products.tags,
        metaTitle: products.metaTitle,
        metaDesc: products.metaDesc,
        seoKeywords: products.seoKeywords,
        ogImageUrl: products.ogImageUrl,
        canonicalUrl: products.canonicalUrl,
        noIndex: products.noIndex,
        noFollow: products.noFollow,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        categoryName: productCategories.name,
        vendor: {
          id: vendors.id,
          storeName: vendors.storeName,
          storeSlug: vendors.storeSlug,
          logoUrl: vendors.logoUrl,
          rating: vendors.rating,
        },
      })
      .from(products)
      .leftJoin(vendors, eq(products.vendorId, vendors.id))
      .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
      .where(and(eq(products.slug, slug), eq(products.isActive, true)));

    if (!rows[0]) return null;

    const p = rows[0];
    const v = p.vendor;

    const [variants, images] = await Promise.all([
      db.select({
        id: productVariants.id,
        productId: productVariants.productId,
        name: productVariants.name,
        priceInr: productVariants.priceInr,
        mrpInr: productVariants.mrpInr,
        weight: productVariants.weight,
        stock: productVariants.stock,
        sku: productVariants.sku,
        isActive: productVariants.isActive,
        sortOrder: productVariants.sortOrder,
      }).from(productVariants)
        .where(and(eq(productVariants.productId, p.id), eq(productVariants.isActive, true)))
        .orderBy(asc(productVariants.sortOrder)),
      db.select().from(productImages)
        .where(eq(productImages.productId, p.id))
        .orderBy(asc(productImages.sortOrder)),
    ]);

    return { ...p, vendor: v?.id ? v : null, variants, images };
  }).catch((err: unknown) => {
    console.error("[product-detail] DB error for slug:", slug, err instanceof Error ? err.message : err);
    return null;
  });

  if (!product) notFound();

  // Related products — prefer categoryId match, fall back to legacy category text
  const relatedCacheSegment = product.categoryId ?? product.category;
  const related = await withCache(`query:related:${relatedCacheSegment}:${slug}`, CACHE_TTL.QUERY, async () => {
    const conditions = product.categoryId
      ? and(eq(products.categoryId, product.categoryId), eq(products.isActive, true), ne(products.slug, slug))
      : and(eq(products.category, product.category), eq(products.isActive, true), ne(products.slug, slug));

    const rows = await db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        category: products.category,
        categoryId: products.categoryId,
        description: products.description,
        isActive: products.isActive,
        isFeatured: products.isFeatured,
        sortOrder: products.sortOrder,
        sku: products.sku,
        vendorId: products.vendorId,
        tags: products.tags,
      })
      .from(products)
      .where(conditions)
      .limit(3);

    const withVariants = await Promise.all(rows.map(async (rp) => {
      const [variants, images] = await Promise.all([
        db.select({
          id: productVariants.id,
          productId: productVariants.productId,
          name: productVariants.name,
          priceInr: productVariants.priceInr,
          mrpInr: productVariants.mrpInr,
          weight: productVariants.weight,
          stock: productVariants.stock,
          sku: productVariants.sku,
          isActive: productVariants.isActive,
          sortOrder: productVariants.sortOrder,
        }).from(productVariants)
          .where(and(eq(productVariants.productId, rp.id), eq(productVariants.isActive, true)))
          .orderBy(asc(productVariants.sortOrder)).limit(2),
        db.select({ id: productImages.id, url: productImages.url, alt: productImages.alt, isPrimary: productImages.isPrimary })
          .from(productImages).where(eq(productImages.productId, rp.id)).limit(1),
      ]);
      return { ...rp, variants, images };
    }));

    return withVariants;
  }).catch(() => []);

  return <ProductDetailClient product={product as any} related={related as any} canEdit={canEdit} />;
}
