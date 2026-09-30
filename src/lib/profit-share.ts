import { db } from "./db";
import { orders, users, vendorCommissions } from "./db/schema";
import { eq, sql } from "drizzle-orm";
import { bwalletGateway } from "./payment/bwallet";

export type ProfitShareResult =
  | { sent: true; status: string; profitPaise: number; recipients?: number }
  | { sent: false; reason: string };

/**
 * Sends the profit of a paid order (= total platform commission on its vendor items) to BuyWell Global,
 * which shares it: 50% company, 10% buyer's referrer, 40% equally over 16 sponsor levels.
 * Only buyers with a linked BuyWell Global account have an upline, so others are skipped.
 * Safe to call repeatedly: Global de-duplicates on the idempotency key.
 */
export async function distributeProfitShareForOrder(orderId: string): Promise<ProfitShareResult> {
  const [order] = await db.select({
    orderNumber: orders.orderNumber,
    paymentStatus: orders.paymentStatus,
    orderBwUserId: orders.bwUserId,
    userBwUserId: users.bwUserId,
  })
    .from(orders)
    .leftJoin(users, eq(users.id, orders.userId))
    .where(eq(orders.id, orderId));

  if (!order) return { sent: false, reason: "order_not_found" };
  if (order.paymentStatus !== "verified") return { sent: false, reason: "payment_not_verified" };

  const bwUserId = order.orderBwUserId ?? order.userBwUserId;
  if (!bwUserId) return { sent: false, reason: "buyer_not_linked_to_buywell_global" };

  const [{ total }] = await db.select({ total: sql<number>`coalesce(sum(${vendorCommissions.commissionAmount}), 0)::int` })
    .from(vendorCommissions)
    .where(eq(vendorCommissions.orderId, orderId));
  if (!total || total <= 0) return { sent: false, reason: "no_commission_on_order" };

  const result = await bwalletGateway.distributeProfit({
    bwUserId,
    orderNumber: order.orderNumber,
    profitPaise: total,
    idempotencyKey: `profit-share-${orderId}`,
  });
  return { sent: true, status: result.status, profitPaise: total, recipients: result.recipients };
}
