import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vendorCommissions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createAdminGuard } from "@/lib/middleware";
import { handleApiError, NotFoundError } from "@/lib/errors";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;

    const { id } = await params;
    const numId = parseInt(id, 10);
    if (isNaN(numId)) return NextResponse.json({ success: false, error: "Invalid id" }, { status: 400 });

    const [existing] = await db.select({ id: vendorCommissions.id })
      .from(vendorCommissions)
      .where(eq(vendorCommissions.id, numId))
      .limit(1);
    if (!existing) throw new NotFoundError("Commission");

    await db.delete(vendorCommissions).where(eq(vendorCommissions.id, numId));
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
