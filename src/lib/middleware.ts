import { NextRequest, NextResponse } from "next/server";
import { getAuthPayload, isAdminRole, isQbiqalRole, type JWTPayload } from "./auth";
import { db } from "./db";
import { vendors } from "./db/schema";
import { eq } from "drizzle-orm";

type AuthGuard = (req: NextRequest) => Promise<NextResponse | null>;

// Returns null if authenticated (proceed), NextResponse if not (reject)
export function createAuthGuard(): AuthGuard {
  return async (req: NextRequest) => {
    const payload = await getAuthPayload(req);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }
    return null;
  };
}

// Admin-only guard
export function createAdminGuard(): AuthGuard {
  return async (req: NextRequest) => {
    const payload = await getAuthPayload(req);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }
    if (!isAdminRole(payload.role)) {
      return NextResponse.json(
        { success: false, error: "Forbidden: admin access required" },
        { status: 403 }
      );
    }
    return null;
  };
}

export function createQbiqalGuard(): AuthGuard {
  return async (req: NextRequest) => {
    const payload = await getAuthPayload(req);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }
    if (!isQbiqalRole(payload.role)) {
      return NextResponse.json(
        { success: false, error: "Forbidden: qbiqal access required" },
        { status: 403 }
      );
    }
    return null;
  };
}

// Vendor guard — user must be role=vendor with an approved vendor record
export function createVendorGuard(): AuthGuard {
  return async (req: NextRequest) => {
    const payload = await getAuthPayload(req);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }
    // Admins can also access vendor APIs (for impersonation / support)
    if (isAdminRole(payload.role)) return null;
    if (payload.role !== "vendor") {
      return NextResponse.json(
        { success: false, error: "Forbidden: vendor access required" },
        { status: 403 }
      );
    }
    const [vendor] = await db.select({ status: vendors.status })
      .from(vendors).where(eq(vendors.userId, payload.sub)).limit(1);
    if (!vendor || vendor.status !== "approved") {
      return NextResponse.json(
        { success: false, error: "Vendor account not approved" },
        { status: 403 }
      );
    }
    return null;
  };
}

// Helper to get approved vendor for the current user (returns null if not a vendor)
export async function getVendorForUser(req: NextRequest) {
  const payload = await getAuthPayload(req);
  if (!payload) return null;
  const [vendor] = await db.select()
    .from(vendors).where(eq(vendors.userId, payload.sub)).limit(1);
  return vendor ?? null;
}

// Re-export for convenience
export { getAuthPayload };
export type { JWTPayload };
