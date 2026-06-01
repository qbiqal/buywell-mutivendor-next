/**
 * Route protection — Next.js 16 proxy.ts convention (not middleware.ts).
 * Runs at the edge on every request before rendering.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getTokenFromRequest, COOKIE_NAME } from "@/lib/auth";

const PROTECTED_CUSTOMER_PREFIXES = ["/orders", "/profile", "/notifications"];
const PROTECTED_ADMIN_PREFIXES    = ["/admin"];
const AUTH_PAGES                  = ["/login", "/register"];
const MUTATING_METHODS            = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/") && MUTATING_METHODS.has(req.method)) {
    const blocked = blockCrossSiteMutation(req);
    if (blocked) return blocked;
  }

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

function blockCrossSiteMutation(req: NextRequest): NextResponse | null {
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const allowedHosts = new Set([
    req.nextUrl.host,
    process.env.NEXT_PUBLIC_APP_URL ? new URL(process.env.NEXT_PUBLIC_APP_URL).host : "",
  ].filter(Boolean));

  const source = origin || referer;
  if (!source) return null;

  try {
    const sourceHost = new URL(source).host;
    if (allowedHosts.has(sourceHost)) return null;
  } catch {
    return null;
  }

  return NextResponse.json(
    { success: false, error: "Cross-site mutation blocked", code: "CSRF_BLOCKED" },
    { status: 403 },
  );
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
    "/api/:path*",
    "/login",
    "/register",
  ],
};
