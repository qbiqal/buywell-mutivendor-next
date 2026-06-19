import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products, productVariants, orderItems } from "@/lib/db/schema";
import { eq, and, ilike, or, sql, gte, lte, isNull, inArray, type SQL } from "drizzle-orm";
import { createAdminGuard } from "@/lib/middleware";
import { handleApiError } from "@/lib/errors";
import { invalidateByPrefix } from "@/lib/cache";
import { requireModuleApi } from "@/lib/modules";

export async function POST(req: NextRequest) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;
    const moduleResult = await requireModuleApi("ecommerce");
    if (moduleResult) return moduleResult;

    const body = await req.json();
    const { action, selectedIds, selectAll, filters } = body;

    if (action !== "delete") {
      return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
    }

    let idsToDelete: string[] = [];

    if (selectAll && filters) {
      const { search, category, categoryId, vendor, status, featured, dateFrom, dateTo, minPrice, maxPrice, minStock, maxStock } = filters;
      const conditions: SQL[] = [];
      if (category) conditions.push(eq(products.category, category));
      if (categoryId) conditions.push(eq(products.categoryId, categoryId));
      if (vendor === "admin") conditions.push(isNull(products.vendorId));
      else if (vendor) { const vid = parseInt(vendor); if (!isNaN(vid)) conditions.push(eq(products.vendorId, vid)); }
      if (status === "active") conditions.push(eq(products.isActive, true));
      if (status === "inactive") conditions.push(eq(products.isActive, false));
      if (featured === "true") conditions.push(eq(products.isFeatured, true));
      if (featured === "false") conditions.push(eq(products.isFeatured, false));
      if (dateFrom) conditions.push(gte(products.createdAt, new Date(`${dateFrom}T00:00:00.000Z`)));
      if (dateTo) conditions.push(lte(products.createdAt, new Date(`${dateTo}T23:59:59.999Z`)));
      if (minPrice !== null && minPrice !== "") {
        const paise = Math.round(Number(minPrice) * 100);
        conditions.push(sql`exists (select 1 from product_variants pv where pv.product_id = ${products.id} and pv.price_inr >= ${paise})`);
      }
      if (maxPrice !== null && maxPrice !== "") {
        const paise = Math.round(Number(maxPrice) * 100);
        conditions.push(sql`exists (select 1 from product_variants pv where pv.product_id = ${products.id} and pv.price_inr <= ${paise})`);
      }
      if (minStock !== null && minStock !== "") {
        conditions.push(sql`exists (select 1 from product_variants pv where pv.product_id = ${products.id} and pv.stock >= ${Number(minStock)})`);
      }
      if (maxStock !== null && maxStock !== "") {
        conditions.push(sql`exists (select 1 from product_variants pv where pv.product_id = ${products.id} and pv.stock <= ${Number(maxStock)})`);
      }
      if (search) {
        conditions.push(or(
          ilike(products.name, `%${search}%`),
          ilike(products.sku,  `%${search}%`),
        ) as SQL);
      }

      const rows = await db.select({ id: products.id }).from(products).where(conditions.length > 0 ? and(...conditions) : undefined);
      idsToDelete = rows.map(r => r.id);
    } else if (selectedIds && Array.isArray(selectedIds)) {
      idsToDelete = selectedIds;
    }

    if (idsToDelete.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    // Check usage in orders
    const usage = await db
      .select({ count: sql<number>`count(distinct ${products.id})` })
      .from(orderItems)
      .innerJoin(productVariants, eq(productVariants.id, orderItems.variantId))
      .innerJoin(products, eq(products.id, productVariants.productId))
      .where(inArray(products.id, idsToDelete));
    
    const usedCount = Number(usage[0]?.count ?? 0);

    // If used in orders, soft delete items used in orders, fully delete others
    // For simplicity, if ANY are used in orders, we can do a single query to find which ones are used
    const usedProducts = await db
      .selectDistinct({ id: products.id })
      .from(orderItems)
      .innerJoin(productVariants, eq(productVariants.id, orderItems.variantId))
      .innerJoin(products, eq(products.id, productVariants.productId))
      .where(inArray(products.id, idsToDelete));
    
    const usedIds = new Set(usedProducts.map(p => p.id));
    const toSoftDelete = idsToDelete.filter(id => usedIds.has(id));
    const toHardDelete = idsToDelete.filter(id => !usedIds.has(id));

    if (toSoftDelete.length > 0) {
      await db.update(products).set({ isActive: false, updatedAt: new Date() }).where(inArray(products.id, toSoftDelete));
      await db.update(productVariants).set({ isActive: false }).where(inArray(productVariants.productId, toSoftDelete));
    }
    
    if (toHardDelete.length > 0) {
      await db.delete(products).where(inArray(products.id, toHardDelete));
    }

    await invalidateByPrefix("query:products:");
    return NextResponse.json({ success: true, count: idsToDelete.length, archived: toSoftDelete.length });
  } catch (err) {
    return handleApiError(err);
  }
}
