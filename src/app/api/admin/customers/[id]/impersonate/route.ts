import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createAdminGuard, getAuthPayload } from "@/lib/middleware";
import { signToken, getTokenFromRequest, COOKIE_NAME, getTokenCookieOptions, isAdminRole } from "@/lib/auth";
import { handleApiError, NotFoundError } from "@/lib/errors";

const IMPERSONATION_COOKIE = "bw_impersonate_admin";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;

    const adminPayload = await getAuthPayload(req);
    if (!adminPayload) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { id: customerId } = await params;

    const rows = await db
      .select({ id: users.id, email: users.email, firstName: users.firstName, role: users.role })
      .from(users)
      .where(eq(users.id, customerId));

    if (!rows[0]) throw new NotFoundError("Customer");
    if (isAdminRole(rows[0].role)) {
      return NextResponse.json({ success: false, error: "Cannot impersonate another admin" }, { status: 400 });
    }

    // Save current admin token so we can restore it later
    const adminToken = await getTokenFromRequest(req);

    // Create a customer session token
    const customerToken = await signToken({
      sub:   rows[0].id,
      email: rows[0].email,
      role:  "customer",
    });

    const res = NextResponse.json({ success: true, data: { customerEmail: rows[0].email } });

    // Store admin token in a separate cookie for restoration
    res.cookies.set({
      ...getTokenCookieOptions(60 * 60 * 4), // 4h max for impersonation
      name: IMPERSONATION_COOKIE,
      value: adminToken ?? "",
    });

    // Replace the main session with customer token
    res.cookies.set({
      ...getTokenCookieOptions(),
      name:  COOKIE_NAME,
      value: customerToken,
    });

    return res;
  } catch (err) {
    return handleApiError(err);
  }
}
