import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, orderStatusHistory } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { razorpayGateway } from "@/lib/payment/razorpay";
import { createVendorSplitsForOrder } from "@/lib/vendor-commission";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = body;

    if (!orderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify HMAC signature: razorpayOrderId + "|" + razorpayPaymentId
    const crypto = await import("crypto");
    const { getSiteConfig } = await import("@/lib/config");
    const keySecret = await getSiteConfig("payment_razorpay_key_secret");
    if (!keySecret) return NextResponse.json({ error: "Razorpay not configured" }, { status: 503 });

    const expectedSig = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (expectedSig !== razorpaySignature) {
      return NextResponse.json({ error: "Payment signature verification failed" }, { status: 400 });
    }

    // Mark order as payment verified
    await db.update(orders).set({
      paymentStatus:     "verified",
      paymentVerifiedAt: new Date(),
      status:            "payment_verified",
      updatedAt:         new Date(),
    }).where(eq(orders.id, orderId));

    await db.insert(orderStatusHistory).values({
      orderId,
      status:    "payment_verified",
      note:      `Razorpay payment verified: ${razorpayPaymentId}`,
      changedBy: "system",
    });

    createVendorSplitsForOrder(orderId).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[razorpay/verify]", err);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
