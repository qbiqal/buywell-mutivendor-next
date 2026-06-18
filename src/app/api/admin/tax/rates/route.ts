import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { taxRates } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { createAdminGuard } from "@/lib/middleware";
import { handleApiError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;

    const rows = await db
      .select()
      .from(taxRates)
      .where(eq(taxRates.isActive, true))
      .orderBy(asc(taxRates.sortOrder), asc(taxRates.totalRate));

    return NextResponse.json({ success: true, taxRates: rows });
  } catch (err) {
    return handleApiError(err);
  }
}
