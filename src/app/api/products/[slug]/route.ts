import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products, productVariants, productImages } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { withCache, CACHE_TTL } from "@/lib/cache";
import { handleApiError, NotFoundError } from "@/lib/errors";
import { requireModuleApi } from "@/lib/modules";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const moduleResult = await requireModuleApi("ecommerce");
    if (moduleResult) return moduleResult;

    const { slug } = await params;
    const cacheKey = `query:product:${slug}`;

    const data = await withCache(cacheKey, CACHE_TTL.QUERY, async () => {
      const rows = await db
        .select()
        .from(products)
        .where(and(eq(products.slug, slug), eq(products.isActive, true)));

      if (!rows[0]) throw new NotFoundError("Product");

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

    return NextResponse.json({ success: true, data });
  } catch (err) {
    return handleApiError(err);
  }
}
