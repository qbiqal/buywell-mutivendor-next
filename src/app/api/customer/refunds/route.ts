import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders, refundEvents, refundRequests } from "@/lib/db/schema";
import { handleApiError, NotFoundError, ValidationError } from "@/lib/errors";
import { createAuthGuard, getAuthPayload } from "@/lib/middleware";
import { requireModuleApi } from "@/lib/modules";

export async function GET(req: NextRequest) {
  try {
    const moduleResult = await requireModuleApi("ecommerce");
    if (moduleResult) return moduleResult;
    const authResult = await createAuthGuard()(req);
    if (authResult) return authResult;
    const payload = await getAuthPayload(req);

    const rows = await db.select().from(refundRequests)
      .where(eq(refundRequests.userId, payload!.sub))
      .orderBy(desc(refundRequests.createdAt));
    return NextResponse.json({ success: true, data: rows });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const moduleResult = await requireModuleApi("ecommerce");
    if (moduleResult) return moduleResult;
    const authResult = await createAuthGuard()(req);
    if (authResult) return authResult;
    const payload = await getAuthPayload(req);

    const body = await req.json();
    const orderId = String(body.orderId ?? "");
    const [order] = await db.select().from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.userId, payload!.sub)))
      .limit(1);
    if (!order) throw new NotFoundError("Order");
    if (!["delivered", "shipped", "processing", "confirmed", "payment_verified"].includes(order.status)) {
      throw new ValidationError("Refund request is not available for this order status");
    }
    const amount = Math.min(order.totalInr, Math.max(1, Math.round(Number(body.requestedAmountInr ?? order.totalInr))));
    const reason = String(body.reason ?? "").trim();
    if (!reason) throw new ValidationError("Refund reason is required");

    const [refund] = await db.insert(refundRequests).values({
      orderId: order.id,
      userId: payload!.sub,
      requestedAmountInr: amount,
      reason,
      customerNote: nullableText(body.customerNote),
    }).returning();
    await db.insert(refundEvents).values({
      refundId: refund.id,
      status: refund.status,
      note: "Customer submitted refund request",
      changedBy: payload!.sub,
    });
    return NextResponse.json({ success: true, data: refund }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

function nullableText(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text ? text : null;
}
