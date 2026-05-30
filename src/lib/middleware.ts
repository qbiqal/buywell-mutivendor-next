import { NextRequest, NextResponse } from "next/server";
import { getAuthPayload, type JWTPayload } from "./auth";

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
    if (payload.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Forbidden: admin access required" },
        { status: 403 }
      );
    }
    return null;
  };
}

// Re-export for convenience
export { getAuthPayload };
export type { JWTPayload };
