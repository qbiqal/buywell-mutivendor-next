import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, users } from "@/lib/db/schema";
import { eq, and, gte, desc, sql } from "drizzle-orm";
import { createAdminGuard } from "@/lib/middleware";
import { handleApiError } from "@/lib/errors";
import { isModuleEnabled } from "@/lib/modules";

export async function GET(req: NextRequest) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;
    const ecommerceEnabled = await isModuleEnabled("ecommerce");
    if (!ecommerceEnabled) {
      return NextResponse.json({
        success: true,
        data: {
          ecommerceEnabled: false,
          ordersToday: 0,
          pendingVerification: 0,
          revenueThisMonth: 0,
          newCustomers: 0,
          recentOrders: [],
        },
      });
    }

    const now       = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const weekStart  = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [ordersToday, pendingVerification, monthOrders, newCustomers, recentOrders] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(orders).where(gte(orders.createdAt, todayStart)),
      db.select({ count: sql<number>`count(*)` }).from(orders).where(eq(orders.paymentStatus, "uploaded")),
      db.select({ total: sql<number>`sum(total_inr)` }).from(orders).where(and(
        gte(orders.createdAt, monthStart),
        eq(orders.paymentStatus, "verified"),
      )),
      db.select({ count: sql<number>`count(*)` }).from(users).where(gte(users.createdAt, weekStart)),
      db.select().from(orders).orderBy(desc(orders.createdAt)).limit(10),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        ordersToday:         Number(ordersToday[0]?.count ?? 0),
        ecommerceEnabled:    true,
        pendingVerification: Number(pendingVerification[0]?.count ?? 0),
        revenueThisMonth:    Number(monthOrders[0]?.total ?? 0),
        newCustomers:        Number(newCustomers[0]?.count ?? 0),
        recentOrders,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
