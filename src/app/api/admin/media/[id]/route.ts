import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { media } from "@/lib/db/schema";
import { createAdminGuard } from "@/lib/middleware";
import { AppError, handleApiError, NotFoundError, ValidationError } from "@/lib/errors";
import { findMediaReferences } from "@/lib/media-references";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;

    const { id } = await params;
    const rows = await db.select().from(media).where(eq(media.id, id)).limit(1);
    if (!rows[0]) throw new NotFoundError("Media");

    const references = await findMediaReferences(rows[0].url);
    return NextResponse.json({
      success: true,
      data: { ...rows[0], referenceCount: references.length, references },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;

    const { id } = await params;
    const body = await req.json() as { alt?: string | null; folder?: string | null };
    const updates: Partial<typeof media.$inferInsert> = {};

    if ("alt" in body) updates.alt = body.alt?.trim() || null;
    if ("folder" in body) {
      const folder = body.folder?.trim();
      if (!folder) throw new ValidationError("Folder cannot be empty");
      if (!/^[a-z0-9][a-z0-9_-]{0,63}$/i.test(folder)) {
        throw new ValidationError("Folder can contain letters, numbers, underscores, and hyphens");
      }
      updates.folder = folder.toLowerCase();
    }

    if (Object.keys(updates).length === 0) {
      throw new ValidationError("No media fields provided");
    }

    const rows = await db.update(media).set(updates).where(eq(media.id, id)).returning();
    if (!rows[0]) throw new NotFoundError("Media");
    return NextResponse.json({ success: true, data: rows[0] });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;

    const { id } = await params;
    const rows = await db.select().from(media).where(eq(media.id, id)).limit(1);
    const item = rows[0];
    if (!item) throw new NotFoundError("Media");

    const references = await findMediaReferences(item.url);
    if (references.length > 0) {
      throw new AppError("Media is still referenced and cannot be deleted", 409, "MEDIA_IN_USE");
    }

    await db.delete(media).where(eq(media.id, id));

    if (item.storage === "local" && item.url.startsWith("/uploads/")) {
      const relative = item.url.replace(/^\/+/, "");
      const filePath = path.join(process.cwd(), "public", relative);
      await fs.rm(filePath, { force: true }).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
