import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vendorPayouts, vendorCommissions } from "@/lib/db/schema";
import { eq, and, desc, sum } from "drizzle-orm";
import { createVendorGuard, getVendorForUser } from "@/lib/middleware";

export async function GET(req: NextRequest) {
  const authResult = await createVendorGuard()(req);
  if (authResult) return authResult;

  const vendor = await getVendorForUser(req);
  if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });

  const [payouts, pendingBalance] = await Promise.all([
    db.select().from(vendorPayouts)
      .where(eq(vendorPayouts.vendorId, vendor.id))
      .orderBy(desc(vendorPayouts.createdAt))
      .limit(50),

    db.select({ total: sum(vendorCommissions.vendorPayout) })
      .from(vendorCommissions)
      .where(and(eq(vendorCommissions.vendorId, vendor.id), eq(vendorCommissions.status, "pending")))
      .then((r) => Number(r[0]?.total ?? 0)),
  ]);

  return NextResponse.json({ success: true, payouts, pendingBalance });
}
