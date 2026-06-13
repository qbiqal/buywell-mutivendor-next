import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vendorPayouts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createAdminGuard } from "@/lib/middleware";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await createAdminGuard()(req);
  if (authResult) return authResult;

  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const body = await req.json();
  const { status, paymentReference, notes } = body;

  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (status) {
    update.status = status;
    if (status === "paid") update.paidAt = new Date();
  }
  if (paymentReference !== undefined) update.paymentReference = paymentReference || null;
  if (notes !== undefined) update.notes = notes || null;

  const [updated] = await db.update(vendorPayouts).set(update).where(eq(vendorPayouts.id, id)).returning();
  if (!updated) return NextResponse.json({ error: "Payout not found" }, { status: 404 });

  return NextResponse.json({ success: true, payout: updated });
}
