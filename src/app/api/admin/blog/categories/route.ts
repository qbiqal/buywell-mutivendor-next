import { NextRequest, NextResponse } from "next/server";
import { asc, eq, sql } from "drizzle-orm";
import slugify from "slugify";
import { db } from "@/lib/db";
import { blogCategories, blogPosts } from "@/lib/db/schema";
import { cacheInvalidate } from "@/lib/cache";
import { handleApiError, NotFoundError, ValidationError } from "@/lib/errors";
import { createAdminGuard } from "@/lib/middleware";
import { requireModuleApi } from "@/lib/modules";

export async function GET(req: NextRequest) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;
    const moduleResult = await requireModuleApi("blog");
    if (moduleResult) return moduleResult;

    const rows = await db.select().from(blogCategories).orderBy(asc(blogCategories.sortOrder), asc(blogCategories.name));
    return NextResponse.json({ success: true, data: rows });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;
    const moduleResult = await requireModuleApi("blog");
    if (moduleResult) return moduleResult;

    const body = await req.json();
    const name = String(body.name ?? "").trim();
    if (!name) throw new ValidationError("Category name is required");
    const slug = String(body.slug || slugify(name, { lower: true, strict: true })).trim();

    const [row] = await db.insert(blogCategories).values({
      name,
      slug,
      color: body.color || "#D97706",
      sortOrder: parseInt(String(body.sortOrder ?? "0"), 10),
    }).returning();
    await cacheInvalidate.blog();
    return NextResponse.json({ success: true, data: row }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;
    const moduleResult = await requireModuleApi("blog");
    if (moduleResult) return moduleResult;

    const body = await req.json();
    const id = String(body.id ?? "");
    if (!id) throw new ValidationError("Category id is required");
    const [existing] = await db.select().from(blogCategories).where(eq(blogCategories.id, id)).limit(1);
    if (!existing) throw new NotFoundError("Blog category");

    await db.update(blogCategories).set({
      name: String(body.name ?? existing.name).trim(),
      slug: String(body.slug ?? existing.slug).trim(),
      color: String(body.color ?? existing.color),
      sortOrder: parseInt(String(body.sortOrder ?? existing.sortOrder), 10),
    }).where(eq(blogCategories.id, id));
    await cacheInvalidate.blog();
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;
    const moduleResult = await requireModuleApi("blog");
    if (moduleResult) return moduleResult;

    const id = req.nextUrl.searchParams.get("id") ?? "";
    if (!id) throw new ValidationError("Category id is required");
    const [usage] = await db.select({ count: sql<number>`count(*)` }).from(blogPosts).where(eq(blogPosts.categoryId, id));
    if (Number(usage?.count ?? 0) > 0) {
      throw new ValidationError("Category is used by blog posts");
    }
    await db.delete(blogCategories).where(eq(blogCategories.id, id));
    await cacheInvalidate.blog();
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
