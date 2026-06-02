import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, getTokenCookieOptions, isAdminRole, verifyToken } from "@/lib/auth";
import { handleApiError } from "@/lib/errors";

const IMPERSONATION_COOKIE = "an_impersonate_admin";

// DELETE — end impersonation session, restore admin token
export async function DELETE(req: NextRequest) {
  try {
    const adminToken = req.cookies.get(IMPERSONATION_COOKIE)?.value;
    if (!adminToken) {
      return NextResponse.json({ success: false, error: "No active impersonation session" }, { status: 400 });
    }

    const payload = await verifyToken(adminToken);
    if (!payload || !isAdminRole(payload.role)) {
      return NextResponse.json({ success: false, error: "Invalid admin token" }, { status: 401 });
    }

    const res = NextResponse.json({ success: true });

    // Restore admin token as the main session
    res.cookies.set({ ...getTokenCookieOptions(), name: COOKIE_NAME, value: adminToken });

    // Clear impersonation cookie
    res.cookies.set({ name: IMPERSONATION_COOKIE, value: "", maxAge: 0, path: "/" });

    return res;
  } catch (err) {
    return handleApiError(err);
  }
}
