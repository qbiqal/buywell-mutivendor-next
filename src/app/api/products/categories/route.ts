import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { productCategories } from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";
import { withCache, CACHE_TTL } from "@/lib/cache";
import { handleApiError } from "@/lib/errors";
import { requireModuleApi } from "@/lib/modules";

export async function GET() {
  try {
    const moduleResult = await requireModuleApi("ecommerce");
    if (moduleResult) return moduleResult;

    const data = await withCache("query:product-categories:public", CACHE_TTL.QUERY, async () =>
      db.select({
        id:          productCategories.id,
        name:        productCategories.name,
        slug:        productCategories.slug,
        parentId:    productCategories.parentId,
        color:       productCategories.color,
        description: productCategories.description,
        hsnCode:     productCategories.hsnCode,
        taxRateId:   productCategories.taxRateId,
        sortOrder:   productCategories.sortOrder,
        isActive:    productCategories.isActive,
        createdAt:   productCategories.createdAt,
        updatedAt:   productCategories.updatedAt,
      }).from(productCategories)
        .where(eq(productCategories.isActive, true))
        .orderBy(asc(productCategories.sortOrder), asc(productCategories.name))
    );
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return handleApiError(err);
  }
}
