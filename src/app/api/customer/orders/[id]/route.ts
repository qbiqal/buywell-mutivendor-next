import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, orderItems, orderStatusHistory } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { createAuthGuard, getAuthPayload } from "@/lib/middleware";
import { handleApiError, NotFoundError, ForbiddenError } from "@/lib/errors";
import { requireModuleApi } from "@/lib/modules";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await createAuthGuard()(req);
    if (authResult) return authResult;
    const moduleResult = await requireModuleApi("ecommerce");
    if (moduleResult) return moduleResult;

    const payload = await getAuthPayload(req);
    const { id } = await params;

    const rows = await db.select().from(orders).where(eq(orders.id, id));
    if (!rows[0]) throw new NotFoundError("Order");

    const order = rows[0];
    if (order.userId !== payload!.sub) throw new ForbiddenError("This order does not belong to you");

    const [items, history] = await Promise.all([
      db.select().from(orderItems).where(eq(orderItems.orderId, id)),
      db.select().from(orderStatusHistory).where(eq(orderStatusHistory.orderId, id)).orderBy(asc(orderStatusHistory.createdAt)),
    ]);

    return NextResponse.json({ success: true, data: { ...order, items, history } });
  } catch (err) {
    return handleApiError(err);
  }
}
