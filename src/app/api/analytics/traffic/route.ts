import { NextRequest, NextResponse } from "next/server";
import { cacheInvalidate } from "@/lib/cache";
import { db } from "@/lib/db";
import { trafficEvents } from "@/lib/db/schema";
import { handleApiError, ValidationError } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const path = clean(body.path, 300);
    if (!path || path.startsWith("/admin") || path.startsWith("/api")) {
      throw new ValidationError("Trackable public path is required");
    }

    await db.insert(trafficEvents).values({
      eventType: clean(body.eventType, 60) || "page_view",
      path,
      referrer: clean(body.referrer, 500) || null,
      source: clean(body.source, 120) || null,
      medium: clean(body.medium, 120) || null,
      campaign: clean(body.campaign, 180) || null,
      visitorId: clean(body.visitorId, 120) || null,
      sessionId: clean(body.sessionId, 120) || null,
      userAgent: clean(req.headers.get("user-agent"), 500) || null,
    });

    await cacheInvalidate.traffic();
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}

function clean(value: unknown, max: number): string {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}
