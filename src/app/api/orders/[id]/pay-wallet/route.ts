import { NextRequest, NextResponse } from "next/server";
import { getTokenFromCookies, verifyToken } from "@/lib/auth";
import { bwalletGateway } from "@/lib/payment/bwallet";
import { db } from "@/lib/db";
import { orders, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params;
  const token = await getTokenFromCookies();
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json() as { amount: number; secondaryGateway?: string };

    // 1. Fetch order and user
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (order.paymentStatus === "verified") return NextResponse.json({ error: "Order already paid" }, { status: 400 });

    const [user] = await db.select().from(users).where(eq(users.id, payload.sub));
    if (!user?.bwUserId) return NextResponse.json({ error: "Account not linked" }, { status: 400 });

    // 2. Validate amount
    const { amount, secondaryGateway } = body;
    if (amount > order.totalInr) return NextResponse.json({ error: "Amount exceeds order total" }, { status: 400 });
    if (amount <= 0) return NextResponse.json({ error: "Amount must be positive" }, { status: 400 });

    // 3. Debit wallet (idempotent — reuse existing key if already debited)
    const idempotencyKey = `order-${order.id}-wallet`;
    const debit = await bwalletGateway.debit({
      bwUserId: user.bwUserId,
      amount,
      orderId: order.orderNumber,
      idempotencyKey,
    });

    // 4. Update order
    const remaining = order.totalInr - amount;
    const isFullPayment = remaining <= 0;

    await db.update(orders).set({
      bwWalletAmount: amount,
      bwWalletTransactionId: debit.transactionId,
      bwUserId: user.bwUserId,
      paymentStatus: isFullPayment ? "verified" : "partial",
      status: isFullPayment ? "confirmed" : "payment_pending",
      paymentVerifiedAt: isFullPayment ? new Date() : null,
      ...(secondaryGateway ? { secondaryGateway } : {}),
      updatedAt: new Date(),
    }).where(eq(orders.id, orderId));

    return NextResponse.json({
      success: true,
      isFullPayment,
      walletPaid: amount,
      remaining,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
