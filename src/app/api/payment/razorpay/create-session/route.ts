import { NextRequest, NextResponse } from "next/server";
import { razorpayGateway } from "@/lib/payment/razorpay";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const enabled = await razorpayGateway.isEnabled();
    if (!enabled) return NextResponse.json({ error: "Razorpay is not enabled" }, { status: 503 });

    const body = await req.json();
    const { orderId } = body;
    if (!orderId) return NextResponse.json({ error: "orderId required" }, { status: 400 });

    const [order] = await db.select({
      id: orders.id,
      totalInr: orders.totalInr,
      guestName: orders.guestName,
      guestPhone: orders.guestPhone,
    }).from(orders).where(eq(orders.id, orderId)).limit(1);

    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    const session = await razorpayGateway.createSession({
      orderId: order.id,
      amount: order.totalInr,
      currency: "INR",
      customerName: order.guestName ?? undefined,
      customerPhone: order.guestPhone ?? undefined,
    });

    return NextResponse.json({
      success: true,
      razorpayOrderId: session.sessionId,
      keyId: session.metadata.keyId,
      amount: session.amount,
      currency: "INR",
      customerName: session.metadata.customerName,
      customerPhone: session.metadata.customerPhone,
    });
  } catch (err) {
    console.error("[razorpay/create-session]", err);
    return NextResponse.json({ error: "Failed to create Razorpay session" }, { status: 500 });
  }
}
