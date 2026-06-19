import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vendors } from "@/lib/db/schema";
import { eq, and, ilike, or, gte, lte, inArray, type SQL } from "drizzle-orm";
import { createAdminGuard } from "@/lib/middleware";
import { handleApiError } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;

    const body = await req.json();
    const { action, selectedIds, selectAll, filters } = body;

    if (action !== "suspend") {
      return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
    }

    let idsToUpdate: number[] = [];

    if (selectAll && filters) {
      const { search, status, dateFrom, dateTo, minSales, maxSales } = filters;
      const conditions: SQL[] = [];
      
      if (status) conditions.push(eq(vendors.status, status));
      if (dateFrom) conditions.push(gte(vendors.createdAt, new Date(`${dateFrom}T00:00:00.000Z`)));
      if (dateTo) conditions.push(lte(vendors.createdAt, new Date(`${dateTo}T23:59:59.999Z`)));
      if (minSales) conditions.push(gte(vendors.totalSales, Math.round(Number(minSales) * 100)));
      if (maxSales) conditions.push(lte(vendors.totalSales, Math.round(Number(maxSales) * 100)));
      
      if (search) {
        conditions.push(or(
          ilike(vendors.storeName, `%${search}%`),
          ilike(vendors.email, `%${search}%`),
          ilike(vendors.phone, `%${search}%`),
          ilike(vendors.gstin, `%${search}%`)
        ) as SQL);
      }

      const rows = await db.select({ id: vendors.id }).from(vendors).where(conditions.length > 0 ? and(...conditions) : undefined);
      idsToUpdate = rows.map(r => r.id);
    } else if (selectedIds && Array.isArray(selectedIds)) {
      idsToUpdate = selectedIds.map(id => Number(id)).filter(id => !isNaN(id));
    }

    if (idsToUpdate.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    // Suspend the vendors
    await db.update(vendors).set({ status: "suspended", updatedAt: new Date() }).where(inArray(vendors.id, idsToUpdate));

    return NextResponse.json({ success: true, count: idsToUpdate.length });
  } catch (err) {
    return handleApiError(err);
  }
}
