import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { createAuthGuard, getAuthPayload } from "@/lib/middleware";
import { handleApiError, ValidationError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const authResult = await createAuthGuard()(req);
    if (authResult) return authResult;
    const payload = await getAuthPayload(req);

    const { searchParams } = req.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
    const offset = (page - 1) * limit;

    const [rows, countRows, unreadRows] = await Promise.all([
      db.select().from(notifications)
        .where(eq(notifications.userId, payload!.sub))
        .orderBy(desc(notifications.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(notifications)
        .where(eq(notifications.userId, payload!.sub)),
      db.select({ count: sql<number>`count(*)` }).from(notifications)
        .where(and(eq(notifications.userId, payload!.sub), eq(notifications.isRead, false))),
    ]);

    const total = Number(countRows[0]?.count ?? 0);
    return NextResponse.json({
      success: true,
      data: rows,
      unread: Number(unreadRows[0]?.count ?? 0),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authResult = await createAuthGuard()(req);
    if (authResult) return authResult;
    const payload = await getAuthPayload(req);
    const body = await req.json();

    if (body?.markAll === true) {
      await db.update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.userId, payload!.sub));
      return NextResponse.json({ success: true });
    }

    const id = typeof body?.id === "string" ? body.id : "";
    if (!id) throw new ValidationError("Notification id is required");

    await db.update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.userId, payload!.sub), eq(notifications.id, id)));

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
