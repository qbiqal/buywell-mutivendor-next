import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, or } from "drizzle-orm";
import { signToken, getTokenCookieOptions, type UserRole } from "@/lib/auth";
import { handleApiError, AppError, ValidationError } from "@/lib/errors";
import { getSiteConfig } from "@/lib/config";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body as { username?: string; password?: string };

    if (!username || !password) {
      throw new ValidationError("BuyWell username and password are required");
    }

    const ip = getClientIp(req);
    const ipLimit = await rateLimit({ key: `rate:auth:bwlogin:ip:${ip}`, limit: 15, windowSeconds: 15 * 60 });
    if (!ipLimit.allowed) {
      throw new AppError("Too many login attempts. Please try again later.", 429, "RATE_LIMITED");
    }

    // 1. Authenticate against BuyWell backend
    const bwApiUrl = (await getSiteConfig("payment_bwallet_api_url")) ?? "http://localhost:8000";
    const bwApiKey = await getSiteConfig("payment_bwallet_api_key");

    const bwRes = await fetch(`${bwApiUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ username: username.trim(), password }),
      signal: AbortSignal.timeout(8000),
    });

    if (!bwRes.ok) {
      const errBody = await bwRes.json().catch(() => ({}));
      const msg = errBody?.message || errBody?.error || "Invalid BuyWell credentials";
      throw new AppError(msg === "auth.login_failed" ? "Invalid username or password" : msg, 401);
    }

    const bwData = await bwRes.json();
    if (!bwData.success) {
      throw new AppError("Invalid BuyWell username or password", 401);
    }

    const bwUser = bwData.data.user;
    const bwUserId: number = bwUser.id;
    const bwUsername: string = bwUser.username;
    const syntheticEmail = `${bwUsername.toLowerCase()}@buywell.mlm`;

    // 2. Find or create multivendor user linked to this bw_user_id
    let [mvUser] = await db.select().from(users).where(eq(users.bwUserId, bwUserId));

    if (!mvUser) {
      // Also check by synthetic email (idempotent re-creation guard)
      const [byEmail] = await db.select().from(users).where(eq(users.email, syntheticEmail));
      if (byEmail) {
        // Link bw_user_id if not already linked
        await db.update(users)
          .set({ bwUserId, bwLinkedAt: new Date(), updatedAt: new Date() })
          .where(eq(users.id, byEmail.id));
        mvUser = { ...byEmail, bwUserId, bwLinkedAt: new Date() };
      } else {
        // Create new multivendor account for this BuyWell user
        const nameParts = (bwUser.name || bwUsername).trim().split(" ");
        const firstName = nameParts[0] || bwUsername;
        const lastName = nameParts.slice(1).join(" ") || null;

        const [created] = await db.insert(users).values({
          email: syntheticEmail,
          passwordHash: "",            // BuyWell-auth-only, no local password
          firstName,
          lastName,
          phone: bwUser.mobile || null,
          role: "customer" as UserRole,
          isActive: true,
          emailVerified: true,          // Authenticated via BuyWell — treat as verified
          bwUserId,
          bwLinkedAt: new Date(),
        }).returning();

        mvUser = created;
      }
    }

    if (!mvUser.isActive) {
      throw new AppError("Your account has been deactivated. Please contact support.", 403);
    }

    // 3. Issue multivendor JWT
    const token = await signToken({
      sub: mvUser.id,
      email: mvUser.email,
      role: mvUser.role as UserRole,
    });

    const response = NextResponse.json({
      success: true,
      data: {
        id: mvUser.id,
        email: mvUser.email,
        firstName: mvUser.firstName,
        lastName: mvUser.lastName,
        role: mvUser.role,
        avatarUrl: mvUser.avatarUrl,
        bwUserId,
        bwUsername,
      },
    });

    const cookieOpts = getTokenCookieOptions();
    response.cookies.set(cookieOpts.name, token, cookieOpts);

    return response;
  } catch (err) {
    return handleApiError(err);
  }
}
