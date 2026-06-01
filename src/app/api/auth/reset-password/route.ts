import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { handleApiError, ValidationError, AppError } from "@/lib/errors";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { normalizeTarget, verifyOtpCode } from "@/lib/otp";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = typeof body?.email === "string" ? normalizeTarget(body.email) : "";
    const code = typeof body?.code === "string" ? body.code.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!email || !code || !password) {
      throw new ValidationError("Email, code, and new password are required");
    }
    if (password.length < 6) {
      throw new ValidationError("Password must be at least 6 characters");
    }

    const limit = await rateLimit({
      key: `rate:auth:reset:${getClientIp(req)}:${email}`,
      limit: 10,
      windowSeconds: 60 * 60,
    });
    if (!limit.allowed) {
      throw new AppError("Too many reset attempts. Please try again later.", 429, "RATE_LIMITED");
    }

    const verification = await verifyOtpCode({ purpose: "password_reset", target: email, code });
    if (!verification.success) {
      throw new ValidationError(verification.error ?? "Invalid or expired code");
    }

    const rows = verification.userId
      ? await db.select({ id: users.id, isActive: users.isActive }).from(users).where(eq(users.id, verification.userId)).limit(1)
      : await db.select({ id: users.id, isActive: users.isActive }).from(users).where(eq(users.email, email)).limit(1);
    const user = rows[0];
    if (!user || !user.isActive) {
      throw new AppError("Unable to reset this account password", 403);
    }

    await db.update(users)
      .set({ passwordHash: await bcrypt.hash(password, 12), updatedAt: new Date() })
      .where(eq(users.id, user.id));

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
