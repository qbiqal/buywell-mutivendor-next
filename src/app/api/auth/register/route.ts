import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { signToken, getTokenCookieOptions } from "@/lib/auth";
import { handleApiError, ValidationError, AppError } from "@/lib/errors";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { sendEmailVerificationOtp } from "@/lib/otp";
import { createInAppNotification } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, firstName, lastName, phone } = body as {
      email?: string;
      password?: string;
      firstName?: string;
      lastName?: string;
      phone?: string;
    };

    if (!email || !password || !firstName) {
      throw new ValidationError("Email, password, and first name are required");
    }
    if (password.length < 6) {
      throw new ValidationError("Password must be at least 6 characters");
    }

    const normalizedEmail = email.toLowerCase().trim();
    const ipLimit = await rateLimit({
      key: `rate:auth:register:ip:${getClientIp(req)}`,
      limit: 10,
      windowSeconds: 60 * 60,
    });
    if (!ipLimit.allowed) {
      throw new AppError("Too many registration attempts. Please try again later.", 429, "RATE_LIMITED");
    }

    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, normalizedEmail));
    if (existing.length > 0) {
      throw new AppError("An account with this email already exists", 409);
    }

    const [user] = await db.insert(users).values({
      email: normalizedEmail,
      passwordHash: await bcrypt.hash(password, 12),
      firstName: firstName.trim(),
      lastName: lastName?.trim(),
      phone: phone?.trim(),
      role: "customer",
    }).returning();

    const emailVerification = await sendEmailVerificationOtp({
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
    });
    await createInAppNotification({
      userId: user.id,
      type: "account_created",
      title: "Welcome to APRAS Naturals",
      body: "Your account has been created. Verify your email to complete account setup.",
      link: "/verify-email",
    });

    const token = await signToken({
      sub: user.id,
      email: user.email,
      role: "customer",
    });

    const response = NextResponse.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        emailVerified: user.emailVerified,
        emailVerification,
      },
    }, { status: 201 });

    const cookieOpts = getTokenCookieOptions();
    response.cookies.set(cookieOpts.name, token, cookieOpts);

    return response;
  } catch (err) {
    return handleApiError(err);
  }
}
