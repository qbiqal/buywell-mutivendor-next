import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, orderItems, orderStatusHistory, users } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { createAdminGuard, getAuthPayload } from "@/lib/middleware";
import { handleApiError, NotFoundError, ValidationError } from "@/lib/errors";
import { notifyCustomerOrderConfirmed, notifyCustomerOrderShipped } from "@/lib/whatsapp";
import { requireModuleApi } from "@/lib/modules";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;
    const moduleResult = await requireModuleApi("ecommerce");
    if (moduleResult) return moduleResult;

    const { id } = await params;
    const rows = await db.select().from(orders).where(eq(orders.id, id));
    if (!rows[0]) throw new NotFoundError("Order");

    const [items, history] = await Promise.all([
      db.select().from(orderItems).where(eq(orderItems.orderId, id)),
      db.select().from(orderStatusHistory).where(eq(orderStatusHistory.orderId, id)).orderBy(asc(orderStatusHistory.createdAt)),
    ]);

    return NextResponse.json({ success: true, data: { ...rows[0], items, history } });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;
    const moduleResult = await requireModuleApi("ecommerce");
    if (moduleResult) return moduleResult;

    const payload = await getAuthPayload(req);
    const { id }  = await params;
    const body    = await req.json();
    const { status, adminNotes, trackingNumber, trackingUrl, courier, estimatedDelivery, verifyPayment } = body;

    const existing = await db.select().from(orders).where(eq(orders.id, id));
    if (!existing[0]) throw new NotFoundError("Order");

    const order = existing[0];
    const updates: Partial<typeof order> = { updatedAt: new Date() };

    if (status)            updates.status          = status;
    if (adminNotes !== undefined) updates.adminNotes = adminNotes;
    if (trackingNumber)    updates.trackingNumber   = trackingNumber;
    if (trackingUrl)       updates.trackingUrl      = trackingUrl;
    if (courier)           updates.courier          = courier;
    if (estimatedDelivery) updates.estimatedDelivery = estimatedDelivery;

    if (verifyPayment) {
      updates.paymentStatus      = "verified";
      updates.paymentVerifiedAt  = new Date();
      updates.paymentVerifiedBy  = payload!.sub;
      if (!status) updates.status = "payment_verified";
    }

    await db.update(orders).set(updates).where(eq(orders.id, id));

    // Status history
    if (status || verifyPayment) {
      await db.insert(orderStatusHistory).values({
        orderId:   id,
        status:    (status ?? (verifyPayment ? "payment_verified" : order.status)) as string,
        note:      body.note ?? null,
        changedBy: payload!.sub,
      });
    }

    // WhatsApp notifications
    const phone = order.guestPhone ?? "";
    const name  = order.guestName ?? "Customer";

    if (status === "confirmed" || (verifyPayment && !status)) {
      notifyCustomerOrderConfirmed({ phone, orderNumber: order.orderNumber, customerName: name }).catch(() => {});
    }
    if (status === "shipped" && phone) {
      notifyCustomerOrderShipped({ phone, orderNumber: order.orderNumber, customerName: name, trackingNumber, courier }).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
