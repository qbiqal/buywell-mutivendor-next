import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vendors, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createAdminGuard } from "@/lib/middleware";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await createAdminGuard()(req);
  if (authResult) return authResult;

  const id = parseInt(params.id, 10);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const [row] = await db.select({
    vendor: vendors,
    userEmail: users.email,
    userName: users.firstName,
  })
  .from(vendors)
  .leftJoin(users, eq(users.id, vendors.userId))
  .where(eq(vendors.id, id))
  .limit(1);

  if (!row) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
  return NextResponse.json({ success: true, vendor: { ...row.vendor, userEmail: row.userEmail, userName: row.userName } });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await createAdminGuard()(req);
  if (authResult) return authResult;

  const id = parseInt(params.id, 10);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const body = await req.json();
  const { action, commissionOverride } = body;

  const validActions = ["approve", "reject", "suspend", "unsuspend"];
  const statusMap: Record<string, string> = {
    approve: "approved",
    reject: "rejected",
    suspend: "suspended",
    unsuspend: "approved",
  };

  const update: Record<string, unknown> = { updatedAt: new Date() };

  if (action && validActions.includes(action)) {
    update.status = statusMap[action];

    if (action === "approve") {
      const [vendor] = await db.select({ userId: vendors.userId }).from(vendors).where(eq(vendors.id, id)).limit(1);
      if (vendor) {
        await db.update(users).set({ role: "vendor" }).where(eq(users.id, vendor.userId));
      }
    }
    if (action === "reject" || action === "suspend") {
      const [vendor] = await db.select({ userId: vendors.userId }).from(vendors).where(eq(vendors.id, id)).limit(1);
      if (vendor) {
        await db.update(users).set({ role: "customer" }).where(eq(users.id, vendor.userId));
      }
    }
  }

  if (commissionOverride !== undefined) update.commissionOverride = commissionOverride;
  if (body.rejectedReason !== undefined) update.rejectedReason = body.rejectedReason || null;
  if (action === "approve") { update.approvedAt = new Date(); update.rejectedAt = null; update.rejectedReason = null; }
  if (action === "reject") { update.rejectedAt = new Date(); update.approvedAt = null; }

  const [updated] = await db.update(vendors).set(update).where(eq(vendors.id, id)).returning();
  if (!updated) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });

  return NextResponse.json({ success: true, vendor: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await createAdminGuard()(req);
  if (authResult) return authResult;

  const id = parseInt(params.id, 10);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const [vendor] = await db.select({ userId: vendors.userId }).from(vendors).where(eq(vendors.id, id)).limit(1);
  if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });

  await db.update(vendors).set({ status: "suspended", updatedAt: new Date() }).where(eq(vendors.id, id));
  await db.update(users).set({ role: "customer" }).where(eq(users.id, vendor.userId));

  return NextResponse.json({ success: true });
}
