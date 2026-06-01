import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products, productVariants, productImages } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { withCache, CACHE_TTL } from "@/lib/cache";
import { handleApiError } from "@/lib/errors";
import { requireModuleApi } from "@/lib/modules";

export async function GET(req: NextRequest) {
  try {
    const moduleResult = await requireModuleApi("ecommerce");
    if (moduleResult) return moduleResult;

    const { searchParams } = req.nextUrl;
    const category  = searchParams.get("category");
    const featured  = searchParams.get("featured") === "true";

    const cacheKey = `query:products:${category ?? "all"}:${featured}`;
    const data = await withCache(cacheKey, CACHE_TTL.QUERY, async () => {
      const conditions = [eq(products.isActive, true)];
      if (category) conditions.push(eq(products.category, category));
      if (featured)  conditions.push(eq(products.isFeatured, true));

      const rows = await db
        .select()
        .from(products)
        .where(and(...conditions))
        .orderBy(asc(products.sortOrder));

      // Fetch variants and images for each product
      const result = await Promise.all(
        rows.map(async (p) => {
          const [variants, images] = await Promise.all([
            db.select().from(productVariants)
              .where(and(eq(productVariants.productId, p.id), eq(productVariants.isActive, true)))
              .orderBy(asc(productVariants.sortOrder)),
            db.select().from(productImages)
              .where(eq(productImages.productId, p.id))
              .orderBy(asc(productImages.sortOrder)),
          ]);
          return { ...p, variants, images };
        })
      );
      return result;
    });

    return NextResponse.json({ success: true, data });
  } catch (err) {
    return handleApiError(err);
  }
}
