import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pushSubscriptions } from "@/lib/db/schema";
import { createAuthGuard, getAuthPayload } from "@/lib/middleware";
import { handleApiError, ValidationError, AppError } from "@/lib/errors";
import { getNotificationConfig } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  try {
    const authResult = await createAuthGuard()(req);
    if (authResult) return authResult;
    const payload = await getAuthPayload(req);
    const config = await getNotificationConfig();
    if (!config.pushEnabled) {
      throw new AppError("Push notifications are disabled", 403, "PUSH_DISABLED");
    }

    const body = await req.json();
    const endpoint = typeof body?.endpoint === "string" ? body.endpoint : "";
    const p256dh = typeof body?.keys?.p256dh === "string" ? body.keys.p256dh : "";
    const auth = typeof body?.keys?.auth === "string" ? body.keys.auth : "";
    if (!endpoint || !p256dh || !auth) {
      throw new ValidationError("endpoint, keys.p256dh, and keys.auth are required");
    }

    await db.insert(pushSubscriptions).values({
      userId: payload!.sub,
      endpoint,
      p256dh,
      auth,
      provider: config.pushProvider,
      isActive: true,
    }).onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: {
        userId: payload!.sub,
        p256dh,
        auth,
        provider: config.pushProvider,
        isActive: true,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
