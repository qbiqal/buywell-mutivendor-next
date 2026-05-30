import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createAuthGuard, getAuthPayload } from "@/lib/middleware";
import { handleApiError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const authResult = await createAuthGuard()(req);
    if (authResult) return authResult;

    const payload = await getAuthPayload(req);
    const rows = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        phone: users.phone,
        role: users.role,
        avatarUrl: users.avatarUrl,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, payload!.sub));

    if (!rows[0]) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: rows[0] });
  } catch (err) {
    return handleApiError(err);
  }
}
