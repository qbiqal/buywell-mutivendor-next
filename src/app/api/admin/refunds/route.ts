import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders, refundEvents, refundRequests, users } from "@/lib/db/schema";
import { cacheInvalidate } from "@/lib/cache";
import { handleApiError, NotFoundError, ValidationError } from "@/lib/errors";
import { createAdminGuard, getAuthPayload } from "@/lib/middleware";
import { requireModuleApi } from "@/lib/modules";

const STATUSES = new Set(["requested", "under_review", "approved", "rejected", "processed", "cancelled"]);

export async function GET(req: NextRequest) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;
    const moduleResult = await requireModuleApi("ecommerce");
    if (moduleResult) return moduleResult;

    const status = req.nextUrl.searchParams.get("status") ?? "";
    const search = req.nextUrl.searchParams.get("search") ?? "";
    const conditions: SQL[] = [];
    if (status && STATUSES.has(status)) conditions.push(eq(refundRequests.status, status));
    if (search) {
      const like = `%${search}%`;
      conditions.push(or(ilike(orders.orderNumber, like), ilike(users.email, like), ilike(refundRequests.reason, like))!);
    }

    const rows = await db.select({
      id: refundRequests.id,
      orderId: refundRequests.orderId,
      orderNumber: orders.orderNumber,
      customerEmail: users.email,
      requestedAmountInr: refundRequests.requestedAmountInr,
      approvedAmountInr: refundRequests.approvedAmountInr,
      reason: refundRequests.reason,
      customerNote: refundRequests.customerNote,
      adminNote: refundRequests.adminNote,
      status: refundRequests.status,
      refundMethod: refundRequests.refundMethod,
      refundReference: refundRequests.refundReference,
      requestedAt: refundRequests.requestedAt,
      processedAt: refundRequests.processedAt,
    })
      .from(refundRequests)
      .innerJoin(orders, eq(orders.id, refundRequests.orderId))
      .leftJoin(users, eq(users.id, refundRequests.userId))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(refundRequests.createdAt))
      .limit(200);

    return NextResponse.json({ success: true, data: rows });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;
    const moduleResult = await requireModuleApi("ecommerce");
    if (moduleResult) return moduleResult;
    const payload = await getAuthPayload(req);

    const body = await req.json();
    const id = String(body.id ?? "");
    const status = String(body.status ?? "");
    if (!id) throw new ValidationError("Refund id is required");
    if (!STATUSES.has(status)) throw new ValidationError("Invalid refund status");

    const [existing] = await db.select().from(refundRequests).where(eq(refundRequests.id, id)).limit(1);
    if (!existing) throw new NotFoundError("Refund request");

    const updates = {
      status,
      approvedAmountInr: body.approvedAmountInr !== undefined ? Math.round(Number(body.approvedAmountInr)) : existing.approvedAmountInr,
      adminNote: body.adminNote !== undefined ? nullableText(body.adminNote) : existing.adminNote,
      refundMethod: body.refundMethod !== undefined ? nullableText(body.refundMethod) : existing.refundMethod,
      refundReference: body.refundReference !== undefined ? nullableText(body.refundReference) : existing.refundReference,
      proofUrl: body.proofUrl !== undefined ? nullableText(body.proofUrl) : existing.proofUrl,
      processedAt: status === "processed" ? new Date() : existing.processedAt,
      updatedAt: new Date(),
    };
    const [refund] = await db.update(refundRequests).set(updates).where(eq(refundRequests.id, id)).returning();
    await db.insert(refundEvents).values({
      refundId: id,
      status,
      note: nullableText(body.eventNote) ?? nullableText(body.adminNote),
      changedBy: payload!.sub,
    });
    if (status === "processed") {
      await db.update(orders).set({ status: "refunded", updatedAt: new Date() }).where(eq(orders.id, existing.orderId));
    }
    await cacheInvalidate.orders();
    return NextResponse.json({ success: true, data: refund });
  } catch (err) {
    return handleApiError(err);
  }
}

function nullableText(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text ? text : null;
}
