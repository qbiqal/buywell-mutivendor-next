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
      db.select().from(productCategories)
        .where(eq(productCategories.isActive, true))
        .orderBy(asc(productCategories.sortOrder), asc(productCategories.name))
    );
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return handleApiError(err);
  }
}
