import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vendors, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createAuthGuard, getAuthPayload } from "@/lib/middleware";
import { createInAppNotification } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  const authResult = await createAuthGuard()(req);
  if (authResult) return authResult;

  const payload = await getAuthPayload(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // One vendor per user
  const [existing] = await db.select({ id: vendors.id, status: vendors.status })
    .from(vendors).where(eq(vendors.userId, payload.sub)).limit(1);
  if (existing) {
    return NextResponse.json({ error: "Vendor application already exists", status: existing.status }, { status: 409 });
  }

  const body = await req.json();
  const { storeName, storeSlug, storeDescription, phone, email, address, city, state, pincode, gstin, pan, bankAccount, bankIfsc, bankName, accountHolder } = body;

  if (!storeName?.trim()) return NextResponse.json({ error: "Store name is required" }, { status: 400 });
  if (!storeSlug?.trim()) return NextResponse.json({ error: "Store URL slug is required" }, { status: 400 });

  // Slug uniqueness check
  const slugClean = storeSlug.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  const [slugTaken] = await db.select({ id: vendors.id }).from(vendors).where(eq(vendors.storeSlug, slugClean)).limit(1);
  if (slugTaken) return NextResponse.json({ error: "This store URL is already taken" }, { status: 409 });

  const [vendor] = await db.insert(vendors).values({
    userId: payload.sub,
    storeName: storeName.trim(),
    storeSlug: slugClean,
    storeDescription: storeDescription?.trim() || null,
    phone: phone?.trim() || null,
    email: email?.trim() || null,
    address: address?.trim() || null,
    city: city?.trim() || null,
    state: state?.trim() || null,
    pincode: pincode?.trim() || null,
    gstin: gstin?.trim() || null,
    pan: pan?.trim() || null,
    bankAccount: bankAccount?.trim() || null,
    bankIfsc: bankIfsc?.trim() || null,
    bankName: bankName?.trim() || null,
    accountHolder: accountHolder?.trim() || null,
    status: "pending",
  }).returning();

  // Update user role to vendor
  await db.update(users).set({ role: "vendor", updatedAt: new Date() }).where(eq(users.id, payload.sub));

  // Notify admin via in-app notification
  try {
    const admins = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin")).limit(5);
    for (const admin of admins) {
      await createInAppNotification({
        userId: admin.id,
        title: "New Vendor Application",
        body: `${storeName} applied to become a vendor. Review in Admin → Vendors.`,
        type: "info",
        link: `/admin/vendors/${vendor.id}`,
      });
    }
  } catch { /* non-fatal */ }

  return NextResponse.json({ success: true, vendor: { id: vendor.id, status: vendor.status } }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const authResult = await createAuthGuard()(req);
  if (authResult) return authResult;

  const payload = await getAuthPayload(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [vendor] = await db.select().from(vendors).where(eq(vendors.userId, payload.sub)).limit(1);
  if (!vendor) return NextResponse.json({ vendor: null });
  return NextResponse.json({ vendor });
}
