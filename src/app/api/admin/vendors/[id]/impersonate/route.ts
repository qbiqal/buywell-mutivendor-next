import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vendors, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createAdminGuard, getAuthPayload } from "@/lib/middleware";
import { signToken, getTokenFromRequest, COOKIE_NAME, getTokenCookieOptions, type UserRole } from "@/lib/auth";
import { handleApiError, NotFoundError } from "@/lib/errors";

const IMPERSONATION_COOKIE = "bw_impersonate_admin";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;

    const adminPayload = await getAuthPayload(req);
    if (!adminPayload) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const vendorId = parseInt(id, 10);

    const [vendorRow] = await db
      .select({ id: vendors.id, userId: vendors.userId, storeName: vendors.storeName, status: vendors.status })
      .from(vendors)
      .where(eq(vendors.id, vendorId))
      .limit(1);

    if (!vendorRow) throw new NotFoundError("Vendor");
    if (vendorRow.status !== "approved") {
      return NextResponse.json({ success: false, error: "Vendor is not approved" }, { status: 400 });
    }

    const [userRow] = await db
      .select({ id: users.id, email: users.email, role: users.role })
      .from(users)
      .where(eq(users.id, vendorRow.userId))
      .limit(1);

    if (!userRow) throw new NotFoundError("Vendor user account");

    const adminToken = await getTokenFromRequest(req);

    const vendorUserToken = await signToken({
      sub:   userRow.id,
      email: userRow.email,
      role:  userRow.role as UserRole,
    });

    const res = NextResponse.json({ success: true, data: { vendorEmail: userRow.email, storeName: vendorRow.storeName } });

    res.cookies.set({
      ...getTokenCookieOptions(60 * 60 * 4),
      name: IMPERSONATION_COOKIE,
      value: adminToken ?? "",
    });

    res.cookies.set({
      ...getTokenCookieOptions(),
      name:  COOKIE_NAME,
      value: vendorUserToken,
    });

    return res;
  } catch (err) {
    return handleApiError(err);
  }
}
