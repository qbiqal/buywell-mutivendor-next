import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

export const COOKIE_NAME = "an_token";
const JWT_ALG = "HS256";

export interface JWTPayload {
  sub: string;      // userId
  email: string;
  role: "customer" | "admin";
  iat?: number;
  exp?: number;
}

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function signToken(payload: Omit<JWTPayload, "iat" | "exp">): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

// Read token from httpOnly cookie (server components + API routes)
export async function getTokenFromRequest(req: NextRequest): Promise<string | null> {
  return req.cookies.get(COOKIE_NAME)?.value ?? null;
}

// Read token in server components via next/headers
export async function getTokenFromCookies(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value ?? null;
}

export async function getAuthPayload(req: NextRequest): Promise<JWTPayload | null> {
  const token = await getTokenFromRequest(req);
  if (!token) return null;
  return verifyToken(token);
}

// Cookie options for setting the token
export function getTokenCookieOptions(maxAge = 7 * 24 * 60 * 60) {
  return {
    name: COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}
