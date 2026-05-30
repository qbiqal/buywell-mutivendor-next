import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { blogPosts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createAdminGuard } from "@/lib/middleware";
import { handleApiError, NotFoundError } from "@/lib/errors";
import { cacheInvalidate } from "@/lib/cache";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;
    const { id } = await params;
    const rows = await db.select().from(blogPosts).where(eq(blogPosts.id, id));
    if (!rows[0]) throw new NotFoundError("Blog post");
    return NextResponse.json({ success: true, data: rows[0] });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;
    const { id } = await params;
    const body = await req.json();

    const rows = await db.select().from(blogPosts).where(eq(blogPosts.id, id));
    if (!rows[0]) throw new NotFoundError("Blog post");

    const updates: Partial<typeof rows[0]> = { ...body, updatedAt: new Date() };
    // Auto-set publishedAt when publishing
    if (body.status === "published" && !rows[0].publishedAt) {
      updates.publishedAt = new Date();
    }

    await db.update(blogPosts).set(updates).where(eq(blogPosts.id, id));
    await cacheInvalidate.blog();

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;
    const { id } = await params;
    await db.delete(blogPosts).where(eq(blogPosts.id, id));
    await cacheInvalidate.blog();
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
