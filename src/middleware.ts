/**
 * Route protection — Next.js 16 proxy.ts convention (not middleware.ts).
 * Runs at the edge on every request before rendering.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getTokenFromRequest, COOKIE_NAME } from "@/lib/auth";

const PROTECTED_CUSTOMER_PREFIXES = ["/orders", "/profile", "/notifications"];
const PROTECTED_ADMIN_PREFIXES    = ["/admin"];
const AUTH_PAGES                  = ["/login", "/register"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Customer routes — require any authenticated user
  if (PROTECTED_CUSTOMER_PREFIXES.some((p) => pathname.startsWith(p))) {
    const token = await getTokenFromRequest(req);
    if (!token) return redirectToLogin(req);
    const payload = await verifyToken(token);
    if (!payload) return redirectToLogin(req);
    return NextResponse.next();
  }

  // Admin routes — require admin role
  if (PROTECTED_ADMIN_PREFIXES.some((p) => pathname.startsWith(p))) {
    const token = await getTokenFromRequest(req);
    if (!token) return redirectToLogin(req, "/admin");
    const payload = await verifyToken(token);
    if (!payload) return redirectToLogin(req, "/admin");
    if (payload.role !== "admin") {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  // Auth pages — redirect to home if already logged in
  if (AUTH_PAGES.some((p) => pathname.startsWith(p))) {
    const token = await getTokenFromRequest(req);
    if (token) {
      const payload = await verifyToken(token);
      if (payload) {
        const dest = payload.role === "admin" ? "/admin/dashboard" : "/orders";
        return NextResponse.redirect(new URL(dest, req.url));
      }
    }
  }

  return NextResponse.next();
}

function redirectToLogin(req: NextRequest, intended?: string): NextResponse {
  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("redirect", intended ?? req.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/orders/:path*",
    "/profile/:path*",
    "/notifications/:path*",
    "/admin/:path*",
    "/login",
    "/register",
  ],
};
