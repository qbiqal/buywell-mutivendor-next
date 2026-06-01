import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { signToken, getTokenCookieOptions } from "@/lib/auth";
import { handleApiError, ValidationError, AppError } from "@/lib/errors";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body as { email?: string; password?: string };

    if (!email || !password) {
      throw new ValidationError("Email and password are required");
    }

    const normalizedEmail = email.toLowerCase().trim();
    const ip = getClientIp(req);
    const [ipLimit, emailLimit] = await Promise.all([
      rateLimit({ key: `rate:auth:login:ip:${ip}`, limit: 20, windowSeconds: 15 * 60 }),
      rateLimit({ key: `rate:auth:login:email:${normalizedEmail}`, limit: 8, windowSeconds: 15 * 60 }),
    ]);
    if (!ipLimit.allowed || !emailLimit.allowed) {
      throw new AppError("Too many login attempts. Please try again later.", 429, "RATE_LIMITED");
    }

    const rows = await db.select().from(users).where(eq(users.email, normalizedEmail));
    const user = rows[0];

    if (!user) {
      throw new AppError("Invalid email or password", 401);
    }

    if (!user.isActive) {
      throw new AppError("Your account has been deactivated. Please contact support.", 403);
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      throw new AppError("Invalid email or password", 401);
    }

    const token = await signToken({
      sub: user.id,
      email: user.email,
      role: user.role as "customer" | "admin",
    });

    const response = NextResponse.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
    });

    const cookieOpts = getTokenCookieOptions();
    response.cookies.set(cookieOpts.name, token, cookieOpts);

    return response;
  } catch (err) {
    return handleApiError(err);
  }
}
