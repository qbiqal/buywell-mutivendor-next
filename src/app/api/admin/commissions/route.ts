import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vendorCommissions, vendorPayouts, vendors, orders } from "@/lib/db/schema";
import { eq, desc, and, sum, count } from "drizzle-orm";
import { createAdminGuard } from "@/lib/middleware";

export async function GET(req: NextRequest) {
  const authResult = await createAdminGuard()(req);
  if (authResult) return authResult;

  const { searchParams } = new URL(req.url);
  const vendorId = searchParams.get("vendorId");
  const status = searchParams.get("status");

  const where = and(
    vendorId ? eq(vendorCommissions.vendorId, parseInt(vendorId, 10)) : undefined,
    status ? eq(vendorCommissions.status, status) : undefined,
  );

  const [commissions, summary] = await Promise.all([
    db.select({
      id:               vendorCommissions.id,
      orderId:          vendorCommissions.orderId,
      vendorId:         vendorCommissions.vendorId,
      grossAmount:      vendorCommissions.grossAmount,
      commissionRate:   vendorCommissions.commissionRate,
      commissionAmount: vendorCommissions.commissionAmount,
      vendorPayout:     vendorCommissions.vendorPayout,
      status:           vendorCommissions.status,
      createdAt:        vendorCommissions.createdAt,
      storeName:        vendors.storeName,
      orderNumber:      orders.orderNumber,
    })
    .from(vendorCommissions)
    .leftJoin(vendors, eq(vendors.id, vendorCommissions.vendorId))
    .leftJoin(orders, eq(orders.id, vendorCommissions.orderId))
    .where(where)
    .orderBy(desc(vendorCommissions.createdAt))
    .limit(200),

    db.select({
      total: count(),
      totalGross: sum(vendorCommissions.grossAmount),
      totalCommission: sum(vendorCommissions.commissionAmount),
      totalVendorPayout: sum(vendorCommissions.vendorPayout),
    })
    .from(vendorCommissions)
    .where(where),
  ]);

  return NextResponse.json({ success: true, commissions, summary: summary[0] });
}
