import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, addresses } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createAuthGuard, getAuthPayload } from "@/lib/middleware";
import { handleApiError, ValidationError } from "@/lib/errors";
import bcrypt from "bcryptjs";
import { requireModuleApi } from "@/lib/modules";

export async function GET(req: NextRequest) {
  try {
    const authResult = await createAuthGuard()(req);
    if (authResult) return authResult;
    const moduleResult = await requireModuleApi("ecommerce");
    if (moduleResult) return moduleResult;

    const payload = await getAuthPayload(req);
    if (!payload) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const [userRows, addressRows] = await Promise.all([
      db.select({
        id: users.id, email: users.email, firstName: users.firstName,
        lastName: users.lastName, phone: users.phone, avatarUrl: users.avatarUrl,
        createdAt: users.createdAt,
        deletionRequestedAt: users.deletionRequestedAt,
      }).from(users).where(eq(users.id, payload.sub)),
      db.select().from(addresses).where(eq(addresses.userId, payload.sub)),
    ]);

    if (!userRows[0]) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });

    return NextResponse.json({ success: true, data: { ...userRows[0], addresses: addressRows } });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authResult = await createAuthGuard()(req);
    if (authResult) return authResult;
    const moduleResult = await requireModuleApi("ecommerce");
    if (moduleResult) return moduleResult;

    const payload = await getAuthPayload(req);
    if (!payload) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { firstName, lastName, phone, currentPassword, newPassword } = body;

    const updates: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };
    if (firstName !== undefined) updates.firstName = firstName;
    if (lastName  !== undefined) updates.lastName  = lastName || null;
    if (phone     !== undefined) updates.phone     = phone || null;

    // Password change
    if (newPassword) {
      if (!currentPassword) throw new ValidationError("Current password is required to change password");
      const userRows = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, payload.sub));
      if (!userRows[0]) throw new ValidationError("User not found");
      const valid = await bcrypt.compare(currentPassword, userRows[0].passwordHash);
      if (!valid) throw new ValidationError("Current password is incorrect");
      if (newPassword.length < 8) throw new ValidationError("New password must be at least 8 characters");
      updates.passwordHash = await bcrypt.hash(newPassword, 12);
    }

    await db.update(users).set(updates).where(eq(users.id, payload.sub));

    const updated = await db.select({
      id: users.id, email: users.email, firstName: users.firstName,
      lastName: users.lastName, phone: users.phone, avatarUrl: users.avatarUrl,
    }).from(users).where(eq(users.id, payload.sub));

    return NextResponse.json({ success: true, data: updated[0] });
  } catch (err) {
    return handleApiError(err);
  }
}
