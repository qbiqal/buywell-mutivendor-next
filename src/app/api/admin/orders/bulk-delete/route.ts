import { NextResponse, NextRequest } from "next/server";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { inArray } from "drizzle-orm";
import { createAdminGuard } from "@/lib/middleware";

export async function POST(req: NextRequest) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;

    const { orderIds } = await req.json();

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json({ success: false, error: "No order IDs provided" }, { status: 400 });
    }

    await db.update(orders)
      .set({ isDeleted: true })
      .where(inArray(orders.id, orderIds));

    return NextResponse.json({ success: true, message: `Soft deleted ${orderIds.length} orders.` });
  } catch (error: any) {
    console.error("Bulk delete orders error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
