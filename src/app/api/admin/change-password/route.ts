import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createAdminGuard, getAuthPayload } from "@/lib/middleware";
import { handleApiError, ValidationError } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;

    const payload = await getAuthPayload(req);
    if (!payload) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { currentPassword, newPassword, confirmPassword } = await req.json();

    if (!currentPassword) throw new ValidationError("Current password is required");
    if (!newPassword)     throw new ValidationError("New password is required");
    if (newPassword.length < 8) throw new ValidationError("New password must be at least 8 characters");
    if (newPassword !== confirmPassword) throw new ValidationError("Passwords do not match");

    const rows = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, payload.sub));
    if (!rows[0]) throw new ValidationError("User not found");

    const valid = await bcrypt.compare(currentPassword, rows[0].passwordHash);
    if (!valid) throw new ValidationError("Current password is incorrect");

    await db.update(users)
      .set({ passwordHash: await bcrypt.hash(newPassword, 12), updatedAt: new Date() })
      .where(eq(users.id, payload.sub));

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
