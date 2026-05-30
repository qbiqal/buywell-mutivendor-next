import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, orderItems } from "@/lib/db/schema";
import { eq, desc, and, ilike, or, sql } from "drizzle-orm";
import { createAdminGuard } from "@/lib/middleware";
import { handleApiError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;

    const { searchParams } = req.nextUrl;
    const status   = searchParams.get("status");
    const search   = searchParams.get("search");
    const page     = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit    = Math.min(50, parseInt(searchParams.get("limit") ?? "20"));
    const offset   = (page - 1) * limit;

    const conditions: ReturnType<typeof eq>[] = [];
    if (status) conditions.push(eq(orders.status, status));
    if (search) {
      conditions.push(or(
        ilike(orders.orderNumber, `%${search}%`),
        ilike(orders.guestName,   `%${search}%`),
        ilike(orders.guestPhone,  `%${search}%`),
      ) as ReturnType<typeof eq>);
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
