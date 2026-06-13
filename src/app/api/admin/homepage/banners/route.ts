import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { homepageBanners } from "@/lib/db/schema";
import { asc } from "drizzle-orm";
import { createAdminGuard } from "@/lib/middleware";
import { redis } from "@/lib/redis";

async function invalidateBannerCache() {
  try {
    const keys = await redis.keys("query:cms:banners:*");
    if (keys.length) await redis.del(...keys);
  } catch { /* non-fatal */ }
}

export async function GET(req: NextRequest) {
  const authResult = await createAdminGuard()(req);
  if (authResult) return authResult;

  const banners = await db.select().from(homepageBanners).orderBy(asc(homepageBanners.sortOrder));
  return NextResponse.json({ success: true, banners });
}

export async function POST(req: NextRequest) {
  const authResult = await createAdminGuard()(req);
  if (authResult) return authResult;

  const body = await req.json();
  const { title, subtitle, imageUrl, mobileImageUrl, linkUrl, linkText, bannerType = "hero", sortOrder = 0, isActive = true, startsAt, endsAt } = body;

  if (!imageUrl) return NextResponse.json({ error: "imageUrl is required" }, { status: 400 });

  const [banner] = await db.insert(homepageBanners).values({
    title: title || null,
    subtitle: subtitle || null,
    imageUrl,
    mobileImageUrl: mobileImageUrl || null,
    linkUrl: linkUrl || null,
    linkText: linkText || null,
    bannerType,
    sortOrder: Number(sortOrder),
    isActive: Boolean(isActive),
    startsAt: startsAt ? new Date(startsAt) : null,
    endsAt: endsAt ? new Date(endsAt) : null,
  }).returning();

  await invalidateBannerCache();
  return NextResponse.json({ success: true, banner }, { status: 201 });
}
