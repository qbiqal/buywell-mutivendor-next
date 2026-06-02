import { NextRequest, NextResponse } from "next/server";
import { createAdminGuard, createQbiqalGuard, getAuthPayload } from "@/lib/middleware";
import { handleApiError, ValidationError } from "@/lib/errors";
import { isQbiqalRole } from "@/lib/auth";
import {
  creditNotificationWallet,
  getNotificationWalletDashboard,
  isNotificationWalletChannel,
} from "@/lib/notification-wallet";

export async function GET(req: NextRequest) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;
    const payload = await getAuthPayload(req);
    const data = await getNotificationWalletDashboard();
    return NextResponse.json({
      success: true,
      data: {
        ...data,
        canCredit: isQbiqalRole(payload?.role),
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await createQbiqalGuard()(req);
    if (authResult) return authResult;
    const payload = await getAuthPayload(req);
    const body = await req.json() as { channel?: string; credits?: number | string; reason?: string };
    const channel = String(body.channel ?? "");
    const credits = Number(body.credits ?? 0);

    if (!isNotificationWalletChannel(channel)) {
      throw new ValidationError("Unsupported notification wallet channel");
    }
    if (!Number.isFinite(credits) || credits <= 0) {
      throw new ValidationError("Credits must be greater than zero");
    }

    const result = await creditNotificationWallet({
      channel,
      credits,
      reason: body.reason?.trim() || "Qbiqal wallet credit",
      createdBy: payload?.sub ?? null,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    return handleApiError(err);
  }
}
