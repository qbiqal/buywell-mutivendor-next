import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vendors } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createVendorGuard, getVendorForUser } from "@/lib/middleware";

export async function GET(req: NextRequest) {
  const authResult = await createVendorGuard()(req);
  if (authResult) return authResult;

  const vendor = await getVendorForUser(req);
  if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
  return NextResponse.json({ success: true, vendor });
}

export async function PATCH(req: NextRequest) {
  const authResult = await createVendorGuard()(req);
  if (authResult) return authResult;

  const vendor = await getVendorForUser(req);
  if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });

  const body = await req.json();
  const allowed = ["storeName","storeDescription","logoUrl","bannerUrl","phone","email","address","city","state","pincode","gstin","pan","bankAccount","bankIfsc","bankName","accountHolder","metaTitle","metaDescription"];
  const update: Record<string, unknown> = { updatedAt: new Date() };
  for (const key of allowed) {
    if (body[key] !== undefined) update[key] = body[key] || null;
  }

  const [updated] = await db.update(vendors).set(update).where(eq(vendors.id, vendor.id)).returning();
  return NextResponse.json({ success: true, vendor: updated });
}
