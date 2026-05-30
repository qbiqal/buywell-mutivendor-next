import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cmsSections } from "@/lib/db/schema";
import { asc } from "drizzle-orm";
import { createAdminGuard } from "@/lib/middleware";
import { handleApiError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;
    const rows = await db.select().from(cmsSections).orderBy(asc(cmsSections.sortOrder));
    return NextResponse.json({ success: true, data: rows });
  } catch (err) {
    return handleApiError(err);
  }
}
