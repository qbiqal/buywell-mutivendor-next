import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { homepageBanners } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createAdminGuard } from "@/lib/middleware";
import { redis } from "@/lib/redis";

async function invalidateBannerCache() {
  try {
    const keys = await redis.keys("query:cms:banners:*");
    if (keys.length) await redis.del(...keys);
  } catch { /* non-fatal */ }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await createAdminGuard()(req);
  if (authResult) return authResult;

  const { id } = await params;
  const [banner] = await db.select().from(homepageBanners).where(eq(homepageBanners.id, Number(id)));
  if (!banner) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true, banner });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await createAdminGuard()(req);
  if (authResult) return authResult;

  const { id } = await params;
  const body = await req.json();
  const { title, subtitle, imageUrl, mobileImageUrl, linkUrl, linkText, bannerType, sortOrder, isActive, startsAt, endsAt } = body;

  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (title !== undefined)           update.title           = title || null;
  if (subtitle !== undefined)        update.subtitle        = subtitle || null;
  if (imageUrl !== undefined)        update.imageUrl        = imageUrl;
  if (mobileImageUrl !== undefined)  update.mobileImageUrl  = mobileImageUrl || null;
  if (linkUrl !== undefined)         update.linkUrl         = linkUrl || null;
  if (linkText !== undefined)        update.linkText        = linkText || null;
  if (bannerType !== undefined)      update.bannerType      = bannerType;
  if (sortOrder !== undefined)       update.sortOrder       = Number(sortOrder);
  if (isActive !== undefined)        update.isActive        = Boolean(isActive);
  if (startsAt !== undefined)        update.startsAt        = startsAt ? new Date(startsAt) : null;
  if (endsAt !== undefined)          update.endsAt          = endsAt ? new Date(endsAt) : null;

  const [banner] = await db.update(homepageBanners).set(update).where(eq(homepageBanners.id, Number(id))).returning();
  if (!banner) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await invalidateBannerCache();
  return NextResponse.json({ success: true, banner });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await createAdminGuard()(req);
  if (authResult) return authResult;

  const { id } = await params;
  await db.delete(homepageBanners).where(eq(homepageBanners.id, Number(id)));
  await invalidateBannerCache();
  return NextResponse.json({ success: true });
}
