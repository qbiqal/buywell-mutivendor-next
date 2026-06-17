import { NextRequest, NextResponse } from "next/server";
import { getTokenFromCookies, verifyToken } from "@/lib/auth";
import { bwalletGateway } from "@/lib/payment/bwallet";
import { db } from "@/lib/db";
import { orders, orderStatusHistory } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params;
  const token = await getTokenFromCookies();
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { reason = "Payment failed — automatic refund" } = await req.json().catch(() => ({}));

    const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (order.userId !== payload.sub)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const txnId = order.bwWalletTransactionId;
    const walletAmount = order.bwWalletAmount ?? 0;

    if (!txnId || walletAmount <= 0) {
      return NextResponse.json({ success: true, message: "No wallet payment to refund" });
    }

    // Already refunded guard
    if (order.paymentStatus === "refunded") {
      return NextResponse.json({ success: true, message: "Already refunded" });
    }

    // Reverse the wallet debit via BuyWell backend
    await bwalletGateway.reverse(txnId, reason);

    await db.update(orders).set({
      paymentStatus: "refunded",
      status: "cancelled",
      bwWalletAmount: 0,
      updatedAt: new Date(),
    }).where(eq(orders.id, orderId));

    await db.insert(orderStatusHistory).values({
      orderId,
      status: "cancelled",
      note: `Wallet refunded (${walletAmount} paise) — ${reason}`,
      changedBy: "system",
    });

    return NextResponse.json({ success: true, refundedPaise: walletAmount });
  } catch (err: any) {
    console.error("[refund-wallet]", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
