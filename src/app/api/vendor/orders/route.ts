import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orderVendorSplits, orders } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { createVendorGuard, getVendorForUser } from "@/lib/middleware";

export async function GET(req: NextRequest) {
  const authResult = await createVendorGuard()(req);
  if (authResult) return authResult;

  const vendor = await getVendorForUser(req);
  if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const where = and(
    eq(orderVendorSplits.vendorId, vendor.id),
    status ? eq(orderVendorSplits.status, status) : undefined,
  );

  const rows = await db.select({
    id: orderVendorSplits.id,
    orderId: orderVendorSplits.orderId,
    subtotal: orderVendorSplits.subtotal,
    status: orderVendorSplits.status,
    createdAt: orderVendorSplits.createdAt,
    orderNumber: orders.orderNumber,
    orderStatus: orders.status,
    guestName: orders.guestName,
    userId: orders.userId,
  })
  .from(orderVendorSplits)
  .innerJoin(orders, eq(orders.id, orderVendorSplits.orderId))
  .where(where)
  .orderBy(desc(orderVendorSplits.createdAt))
  .limit(100);

  return NextResponse.json({ success: true, orders: rows });
}
