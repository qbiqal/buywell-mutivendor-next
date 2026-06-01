import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cmsSections } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { withCache, CACHE_TTL } from "@/lib/cache";
import { handleApiError } from "@/lib/errors";
import { requireModuleApi } from "@/lib/modules";

export async function GET(_req: NextRequest) {
  try {
    const moduleResult = await requireModuleApi("cms");
    if (moduleResult) return moduleResult;

    const data = await withCache("query:cms:sections", CACHE_TTL.CONFIG, async () =>
      db.select().from(cmsSections).where(eq(cmsSections.isEnabled, true)).orderBy(asc(cmsSections.sortOrder))
    );
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return handleApiError(err);
  }
}
