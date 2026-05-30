import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, orderItems } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { createAuthGuard, getAuthPayload } from "@/lib/middleware";
import { handleApiError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const authResult = await createAuthGuard()(req);
    if (authResult) return authResult;

    const payload = await getAuthPayload(req);
    const { searchParams } = req.nextUrl;
    const page  = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(20, parseInt(searchParams.get("limit") ?? "10"));
    const offset = (page - 1) * limit;

    const allOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.userId, payload!.sub))
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset(offset);

    const ordersWithItems = await Promise.all(
      allOrders.map(async (o) => {
        const items = await db.select().from(orderItems).where(eq(orderItems.orderId, o.id));
        return { ...o, items };
      })
    );

    return NextResponse.json({
      success: true,
      data: ordersWithItems,
      pagination: { page, limit, total: ordersWithItems.length, pages: Math.ceil(ordersWithItems.length / limit) },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
