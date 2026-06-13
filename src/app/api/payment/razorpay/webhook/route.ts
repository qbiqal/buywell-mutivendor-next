import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, orderStatusHistory } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { razorpayGateway } from "@/lib/payment/razorpay";
import { createVendorSplitsForOrder } from "@/lib/vendor-commission";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Inject raw body + signature so verifyPayment can check HMAC
  const augmented = { ...(payload as object), __rawBody: rawBody, __signature: signature };

  const event = (payload as Record<string, unknown>).event as string | undefined;

  if (event === "payment.captured") {
    const paymentEntityRaw = ((payload as Record<string, unknown>).payload as Record<string, Record<string, unknown>> | undefined)?.payment?.entity as Record<string, unknown> | undefined;
    const razorpayOrderId = paymentEntityRaw?.order_id as string | undefined;
    const paymentId = paymentEntityRaw?.id as string | undefined;

    if (!razorpayOrderId) return NextResponse.json({ ok: true });

    const notesOrderId = (paymentEntityRaw?.notes as Record<string, string> | undefined)?.orderId;
    if (!notesOrderId) return NextResponse.json({ ok: true });

    const result = await razorpayGateway.verifyPayment({
      orderId: notesOrderId,
      sessionId: razorpayOrderId,
      transactionRef: paymentId,
      webhookPayload: augmented,
    });

    if (result.verified) {
      await db.update(orders).set({
        paymentStatus:     "verified",
        paymentVerifiedAt: new Date(),
        status:            "payment_verified",
        updatedAt:         new Date(),
      }).where(eq(orders.id, notesOrderId));

      await db.insert(orderStatusHistory).values({
        orderId:   notesOrderId,
        status:    "payment_verified",
        note:      `Razorpay payment captured: ${paymentId}`,
        changedBy: "system",
      });

      createVendorSplitsForOrder(notesOrderId).catch(() => {});
    }
  }

  return NextResponse.json({ ok: true });
}
