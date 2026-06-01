import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { products, productVariants, productImages } from "@/lib/db/schema";
import { eq, and, asc, ne } from "drizzle-orm";
import { withCache, CACHE_TTL } from "@/lib/cache";
import { requireModulePage } from "@/lib/modules";
import { getTokenFromCookies, verifyToken } from "@/lib/auth";
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
  return {
    title,
    description,
    alternates: { canonical: `/shop/${p.slug}` },
    openGraph: {
      title,
      description,
      type: "website",
      url: `/shop/${p.slug}`,
      images: image?.url ? [{ url: image.url, alt: image.alt ?? p.name }] : undefined,
    },
    twitter: {
      card: image?.url ? "summary_large_image" : "summary",
      title,
      description,
      images: image?.url ? [image.url] : undefined,
    },
  };
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireModulePage("ecommerce");
  const { slug } = await params;
  const token = await getTokenFromCookies();
  const payload = token ? await verifyToken(token) : null;
  const canEdit = payload?.role === "admin";

  const product = await withCache(`query:product:${slug}`, CACHE_TTL.QUERY, async () => {
    const rows = await db
      .select()
      .from(products)
      .where(and(eq(products.slug, slug), eq(products.isActive, true)));
    if (!rows[0]) return null;

    const [variants, images] = await Promise.all([
      db.select().from(productVariants)
        .where(and(eq(productVariants.productId, rows[0].id), eq(productVariants.isActive, true)))
        .orderBy(asc(productVariants.sortOrder)),
      db.select().from(productImages)
        .where(eq(productImages.productId, rows[0].id))
        .orderBy(asc(productImages.sortOrder)),
    ]);

    return { ...rows[0], variants, images };
  });

  if (!product) notFound();

  // Related products — same category, different slug
  const related = await withCache(`query:related:${product.category}:${slug}`, CACHE_TTL.QUERY, async () => {
    const rows = await db
      .select()
      .from(products)
      .where(and(eq(products.category, product.category), eq(products.isActive, true), ne(products.slug, slug)))
      .limit(3);

    const withVariants = await Promise.all(rows.map(async (p) => {
      const [variants, images] = await Promise.all([
        db.select().from(productVariants)
          .where(and(eq(productVariants.productId, p.id), eq(productVariants.isActive, true)))
          .orderBy(asc(productVariants.sortOrder)).limit(2),
        db.select({ id: productImages.id, url: productImages.url, alt: productImages.alt, isPrimary: productImages.isPrimary })
          .from(productImages).where(eq(productImages.productId, p.id)).limit(1),
      ]);
      return { ...p, variants, images };
    }));

    return withVariants;
  });

  return <ProductDetailClient product={product} related={related} canEdit={canEdit} />;
}
