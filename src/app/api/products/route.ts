import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products, productVariants, productImages, productCategories } from "@/lib/db/schema";
import { eq, and, asc, desc, ilike, or } from "drizzle-orm";
import { withCache, CACHE_TTL } from "@/lib/cache";
import { handleApiError } from "@/lib/errors";
import { requireModuleApi } from "@/lib/modules";

export async function GET(req: NextRequest) {
  try {
    const moduleResult = await requireModuleApi("ecommerce");
    if (moduleResult) return moduleResult;

    const { searchParams } = req.nextUrl;
    const categoryId = searchParams.get("categoryId");  // FK to product_categories
    const featured   = searchParams.get("featured") === "true";
    const search     = searchParams.get("search")?.trim() ?? "";
    const minPrice   = searchParams.get("minPrice");    // rupees
    const maxPrice   = searchParams.get("maxPrice");    // rupees
    const sort       = searchParams.get("sort") ?? "default"; // default|price_asc|price_desc|newest
    const inStock    = searchParams.get("inStock") === "true";
    const page       = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit      = Math.min(48, Math.max(1, parseInt(searchParams.get("limit") ?? "24", 10)));

    // Don't cache when filters are applied — too many combinations
    const hasFilters = !!(search || categoryId || minPrice || maxPrice || inStock || sort !== "default");
    const cacheKey   = `query:products:all:${featured}`;

    const fetchProducts = async () => {
      const conditions = [eq(products.isActive, true)];
      if (categoryId) conditions.push(eq(products.categoryId, categoryId));
      if (featured)   conditions.push(eq(products.isFeatured, true));
      if (search)     conditions.push(
        or(
          ilike(products.name, `%${search}%`),
          ilike(products.description, `%${search}%`)
        )!
      );

      let orderBy;
      switch (sort) {
        case "price_asc":  orderBy = undefined; break; // applied after variant join
        case "price_desc": orderBy = undefined; break;
        case "newest":     orderBy = desc(products.createdAt); break;
        default:           orderBy = asc(products.sortOrder); break;
      }

      const rows = await db
        .select()
        .from(products)
        .where(and(...conditions))
        .orderBy(orderBy ?? asc(products.sortOrder));

      // Fetch variants + images
      let result = await Promise.all(
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

      // Price filter — based on cheapest active variant
      if (minPrice || maxPrice) {
        const min = minPrice ? parseFloat(minPrice) * 100 : 0;
        const max = maxPrice ? parseFloat(maxPrice) * 100 : Infinity;
        result = result.filter((p) => {
          const prices = p.variants.map((v) => v.priceInr);
          if (!prices.length) return false;
          const cheapest = Math.min(...prices);
          return cheapest >= min && cheapest <= max;
        });
      }

      // In-stock filter
      if (inStock) {
        result = result.filter((p) => p.variants.some((v) => v.stock > 0));
      }

      // Price sorting (needs variant data)
      if (sort === "price_asc" || sort === "price_desc") {
        result.sort((a, b) => {
          const pa = Math.min(...(a.variants.map((v) => v.priceInr).length ? a.variants.map((v) => v.priceInr) : [0]));
          const pb = Math.min(...(b.variants.map((v) => v.priceInr).length ? b.variants.map((v) => v.priceInr) : [0]));
          return sort === "price_asc" ? pa - pb : pb - pa;
        });
      }

      return result;
    };

    const rawProducts = hasFilters
      ? await fetchProducts()
      : await withCache(cacheKey, CACHE_TTL.QUERY, fetchProducts);

    // Attach categoryName from nested product_categories
    const allCats = await withCache("query:product-categories:public", CACHE_TTL.QUERY, () =>
      db.select({ id: productCategories.id, name: productCategories.name })
        .from(productCategories)
        .where(eq(productCategories.isActive, true))
    );
    const catNameMap = new Map(allCats.map((c) => [c.id, c.name]));
    const allProducts = rawProducts.map((p) => ({
      ...p,
      categoryName: catNameMap.get(p.categoryId ?? "") ?? null,
    }));

    const total  = allProducts.length;
    const offset = (page - 1) * limit;
    const data   = allProducts.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      data,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
