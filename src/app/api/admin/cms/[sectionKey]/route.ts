import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cmsSections } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createAdminGuard } from "@/lib/middleware";
import { handleApiError } from "@/lib/errors";
import { cacheInvalidate } from "@/lib/cache";
import { requireModuleApi } from "@/lib/modules";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sectionKey: string }> }
) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;
    const moduleResult = await requireModuleApi("cms");
    if (moduleResult) return moduleResult;
    const { sectionKey } = await params;
    const rows = await db.select().from(cmsSections).where(eq(cmsSections.sectionKey, sectionKey));
    return NextResponse.json({ success: true, data: rows[0] ?? null });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ sectionKey: string }> }
) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;
    const moduleResult = await requireModuleApi("cms");
    if (moduleResult) return moduleResult;
    const { sectionKey } = await params;
    const body = await req.json();
    const { config, isEnabled, sortOrder } = body;

    const updates: Partial<typeof cmsSections.$inferInsert> = { updatedAt: new Date() };
    if (config !== undefined) updates.config = config;
    if (isEnabled !== undefined) updates.isEnabled = Boolean(isEnabled);
    if (sortOrder !== undefined) updates.sortOrder = parseInt(String(sortOrder), 10);

    await db.update(cmsSections)
      .set(updates)
      .where(eq(cmsSections.sectionKey, sectionKey));

    await cacheInvalidate.cms();

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
