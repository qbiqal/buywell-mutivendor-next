import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createAuthGuard, getAuthPayload } from "@/lib/middleware";
import { handleApiError } from "@/lib/errors";

// POST /api/customer/delete-account — initiate 60-day soft-delete (DPDP 2023)
export async function POST(req: NextRequest) {
  try {
    const authResult = await createAuthGuard()(req);
    if (authResult) return authResult;

    const payload = await getAuthPayload(req);
    if (!payload) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const now = new Date();
    await db.update(users)
      .set({ deletionRequestedAt: now, isActive: false, updatedAt: now })
      .where(eq(users.id, payload.sub));

    return NextResponse.json({
      success: true,
      message: "Account deletion scheduled. Your account will be permanently deleted after 60 days. You can restore it anytime by logging back in within this period.",
      deletionDate: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    });
  } catch (e) {
    return handleApiError(e);
  }
}

// DELETE /api/customer/delete-account — cancel deletion request (restore account)
export async function DELETE(req: NextRequest) {
  try {
    const authResult = await createAuthGuard()(req);
    if (authResult) return authResult;

    const payload = await getAuthPayload(req);
    if (!payload) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const now = new Date();
    await db.update(users)
      .set({ deletionRequestedAt: null, isActive: true, updatedAt: now })
      .where(eq(users.id, payload.sub));

    return NextResponse.json({
      success: true,
      message: "Account deletion cancelled. Your account has been restored.",
    });
  } catch (e) {
    return handleApiError(e);
  }
}
