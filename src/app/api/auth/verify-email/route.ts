import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { handleApiError, ValidationError } from "@/lib/errors";
import { normalizeTarget, verifyOtpCode } from "@/lib/otp";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = typeof body?.email === "string" ? normalizeTarget(body.email) : "";
    const code = typeof body?.code === "string" ? body.code.trim() : "";

    if (!email || !code) {
      throw new ValidationError("Email and verification code are required");
    }

    const verification = await verifyOtpCode({ purpose: "email_verification", target: email, code });
    if (!verification.success) {
      throw new ValidationError(verification.error ?? "Invalid or expired code");
    }

    const rows = verification.userId
      ? await db.select({ id: users.id }).from(users).where(eq(users.id, verification.userId)).limit(1)
      : await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (rows[0]) {
      await db.update(users)
        .set({ emailVerified: true, updatedAt: new Date() })
        .where(eq(users.id, rows[0].id));
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
