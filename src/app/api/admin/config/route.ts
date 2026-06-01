import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { siteConfig } from "@/lib/db/schema";
import { createAdminGuard } from "@/lib/middleware";
import { handleApiError, ValidationError } from "@/lib/errors";
import { cacheInvalidate } from "@/lib/cache";
import { getAllSiteConfig, setSiteConfig } from "@/lib/config";

export async function GET(req: NextRequest) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;
    const data = await getAllSiteConfig();
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;
    const body = await req.json() as Record<string, string>;
    for (const [key, value] of Object.entries(body)) {
      if (key === "module_core_enabled" && value === "false") {
        throw new ValidationError("Core module cannot be disabled");
      }
      await setSiteConfig(key, value ?? "");
    }
    await cacheInvalidate.config();
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
