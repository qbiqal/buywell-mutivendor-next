import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { handleApiError, ValidationError, AppError } from "@/lib/errors";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { normalizeTarget, sendPasswordResetOtp } from "@/lib/otp";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = typeof body?.email === "string" ? normalizeTarget(body.email) : "";
    if (!email) throw new ValidationError("Email is required");

    const [ipLimit, emailLimit] = await Promise.all([
      rateLimit({ key: `rate:auth:forgot:ip:${getClientIp(req)}`, limit: 12, windowSeconds: 60 * 60 }),
      rateLimit({ key: `rate:auth:forgot:email:${email}`, limit: 5, windowSeconds: 60 * 60 }),
    ]);
    if (!ipLimit.allowed || !emailLimit.allowed) {
      throw new AppError("Too many reset requests. Please try again later.", 429, "RATE_LIMITED");
    }

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    let delivery: Awaited<ReturnType<typeof sendPasswordResetOtp>> | undefined;
    if (user?.isActive) {
      delivery = await sendPasswordResetOtp({
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        message: "If an account exists for that email, a reset code has been sent.",
        deliveryStatus: delivery?.deliveryStatus ?? "queued",
        debugCode: delivery?.debugCode,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
