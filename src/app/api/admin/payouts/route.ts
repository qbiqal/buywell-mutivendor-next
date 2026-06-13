import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vendorPayouts, vendorCommissions, vendors } from "@/lib/db/schema";
import { eq, desc, and, sum, inArray } from "drizzle-orm";
import { createAdminGuard, getAuthPayload } from "@/lib/middleware";

export async function GET(req: NextRequest) {
  const authResult = await createAdminGuard()(req);
  if (authResult) return authResult;

  const { searchParams } = new URL(req.url);
  const vendorId = searchParams.get("vendorId");
  const status = searchParams.get("status");

  const where = and(
    vendorId ? eq(vendorPayouts.vendorId, parseInt(vendorId, 10)) : undefined,
    status ? eq(vendorPayouts.status, status) : undefined,
  );

  const payouts = await db.select({
    id:               vendorPayouts.id,
    vendorId:         vendorPayouts.vendorId,
    amount:           vendorPayouts.amount,
    status:           vendorPayouts.status,
    paymentMethod:    vendorPayouts.paymentMethod,
    paymentReference: vendorPayouts.paymentReference,
    notes:            vendorPayouts.notes,
    initiatedAt:      vendorPayouts.initiatedAt,
    paidAt:           vendorPayouts.paidAt,
    storeName:        vendors.storeName,
  })
  .from(vendorPayouts)
  .leftJoin(vendors, eq(vendors.id, vendorPayouts.vendorId))
  .where(where)
  .orderBy(desc(vendorPayouts.initiatedAt))
  .limit(100);

  return NextResponse.json({ success: true, payouts });
}

export async function POST(req: NextRequest) {
  const authResult = await createAdminGuard()(req);
  if (authResult) return authResult;

  const payload = await getAuthPayload(req);
  const body = await req.json();
  const { vendorId, paymentMethod, paymentReference, notes } = body;

  if (!vendorId) return NextResponse.json({ error: "vendorId required" }, { status: 400 });

  // Calculate pending amount for this vendor
  const [pending] = await db.select({ total: sum(vendorCommissions.vendorPayout) })
    .from(vendorCommissions)
    .where(and(eq(vendorCommissions.vendorId, vendorId), eq(vendorCommissions.status, "pending")));

  const amount = Number(pending?.total ?? 0);
  if (amount <= 0) return NextResponse.json({ error: "No pending payout balance" }, { status: 400 });

  // Create payout
  const [payout] = await db.insert(vendorPayouts).values({
    vendorId,
    amount,
    status: "processing",
    paymentMethod: paymentMethod || null,
    paymentReference: paymentReference || null,
    notes: notes || null,
    initiatedBy: payload?.sub ?? null,
  }).returning();

  // Mark all pending commissions for this vendor as cleared
  await db.update(vendorCommissions)
    .set({ status: "cleared", payoutId: payout.id, updatedAt: new Date() })
    .where(and(eq(vendorCommissions.vendorId, vendorId), eq(vendorCommissions.status, "pending")));

  return NextResponse.json({ success: true, payout }, { status: 201 });
}
