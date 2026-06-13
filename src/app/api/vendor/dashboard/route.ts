import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vendors, orders, orderItems, products, vendorCommissions, orderVendorSplits } from "@/lib/db/schema";
import { eq, and, desc, count, sum } from "drizzle-orm";
import { createVendorGuard, getVendorForUser } from "@/lib/middleware";

export async function GET(req: NextRequest) {
  const authResult = await createVendorGuard()(req);
  if (authResult) return authResult;

  const vendor = await getVendorForUser(req);
  if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });

  const [
    productCount,
    orderStats,
    pendingCommissions,
    recentOrders,
  ] = await Promise.all([
    db.select({ count: count() }).from(products)
      .where(and(eq(products.vendorId, vendor.id), eq(products.isActive, true)))
      .then((r) => r[0]?.count ?? 0),

    db.select({
      totalOrders: count(),
      totalRevenue: sum(orderVendorSplits.subtotal),
    }).from(orderVendorSplits)
      .where(eq(orderVendorSplits.vendorId, vendor.id))
      .then((r) => ({ totalOrders: Number(r[0]?.totalOrders ?? 0), totalRevenue: Number(r[0]?.totalRevenue ?? 0) })),

    db.select({ total: sum(vendorCommissions.vendorPayout) })
      .from(vendorCommissions)
      .where(and(eq(vendorCommissions.vendorId, vendor.id), eq(vendorCommissions.status, "pending")))
      .then((r) => Number(r[0]?.total ?? 0)),

    db.select({
      orderId: orderVendorSplits.orderId,
      subtotal: orderVendorSplits.subtotal,
      status: orderVendorSplits.status,
      createdAt: orderVendorSplits.createdAt,
      orderNumber: orders.orderNumber,
    }).from(orderVendorSplits)
      .innerJoin(orders, eq(orders.id, orderVendorSplits.orderId))
      .where(eq(orderVendorSplits.vendorId, vendor.id))
      .orderBy(desc(orderVendorSplits.createdAt))
      .limit(5),
  ]);

  return NextResponse.json({
    success: true,
    stats: {
      activeProducts: Number(productCount),
      totalOrders: orderStats.totalOrders,
      totalRevenue: orderStats.totalRevenue,
      pendingPayout: pendingCommissions,
      rating: vendor.rating,
    },
    recentOrders,
    vendor: {
      id: vendor.id,
      storeName: vendor.storeName,
      storeSlug: vendor.storeSlug,
      logoUrl: vendor.logoUrl,
      status: vendor.status,
    },
  });
}
