import { NextRequest, NextResponse } from "next/server";
import { createAdminGuard } from "@/lib/middleware";
import { handleApiError, ValidationError } from "@/lib/errors";
import { cacheInvalidate } from "@/lib/cache";
import { getAllSiteConfig, setSiteConfig } from "@/lib/config";
import { revalidateSiteShell } from "@/lib/revalidation";

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
      await setSiteConfig(key, value ?? "", categoryForConfigKey(key));
    }
    await cacheInvalidate.config();
    revalidateSiteShell();
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}

function categoryForConfigKey(key: string): string {
  if (key.startsWith("module_")) return "modules";
  if (key.startsWith("notification_")) return "notification";
  if (key.startsWith("otp_")) return "otp";
  if (key.startsWith("whatsapp_")) return "whatsapp";
  if (key.startsWith("media_")) return "media";
  if (key.startsWith("payment_")) return "payment";
  if (key.startsWith("shipping_")) return "shipping";
  if (key.startsWith("locale_") || key.startsWith("locales_") || key.startsWith("currency_") || key.startsWith("currencies_")) return "localization";
  if (key.startsWith("sentry_")) return "observability";
  return "general";
}
