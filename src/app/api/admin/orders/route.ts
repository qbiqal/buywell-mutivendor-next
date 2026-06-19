import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { eq, desc, and, gte, ilike, lte, or, sql, type SQL } from "drizzle-orm";
import { createAdminGuard } from "@/lib/middleware";
import { handleApiError } from "@/lib/errors";
import { requireModuleApi } from "@/lib/modules";

function numberParam(value: string | null) {
  if (!value || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(req: NextRequest) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;
    const moduleResult = await requireModuleApi("ecommerce");
    if (moduleResult) return moduleResult;

    const { searchParams } = req.nextUrl;
    const status   = searchParams.get("status");
    const search   = searchParams.get("search");
    const paymentStatus = searchParams.get("paymentStatus");
    const sample = searchParams.get("sample");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const minAmount = numberParam(searchParams.get("minAmount"));
    const maxAmount = numberParam(searchParams.get("maxAmount"));
    const page     = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit    = Math.min(50, parseInt(searchParams.get("limit") ?? "20"));
    const offset   = (page - 1) * limit;

    const conditions: SQL[] = [eq(orders.isDeleted, false)];
    if (status) conditions.push(eq(orders.status, status));
    if (paymentStatus) conditions.push(eq(orders.paymentStatus, paymentStatus));
    if (sample === "true") conditions.push(eq(orders.isSampleRequest, true));
    if (sample === "false") conditions.push(eq(orders.isSampleRequest, false));
    if (dateFrom) conditions.push(gte(orders.createdAt, new Date(`${dateFrom}T00:00:00.000Z`)));
    if (dateTo) conditions.push(lte(orders.createdAt, new Date(`${dateTo}T23:59:59.999Z`)));
    if (minAmount !== null) conditions.push(gte(orders.totalInr, Math.round(minAmount * 100)));
    if (maxAmount !== null) conditions.push(lte(orders.totalInr, Math.round(maxAmount * 100)));
    if (search) {
      conditions.push(or(
        ilike(orders.orderNumber, `%${search}%`),
        ilike(orders.guestName,   `%${search}%`),
        ilike(orders.guestPhone,  `%${search}%`),
      ) as SQL);
    }

    const [rows, countRows] = await Promise.all([
      db.select().from(orders)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(orders.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(orders)
        .where(conditions.length > 0 ? and(...conditions) : undefined),
    ]);

    const total = Number(countRows[0]?.count ?? 0);

    return NextResponse.json({
      success: true,
      data: rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
