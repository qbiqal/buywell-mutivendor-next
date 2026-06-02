import { NextRequest, NextResponse } from "next/server";
import { asc, eq, sql } from "drizzle-orm";
import slugify from "slugify";
import { cacheInvalidate } from "@/lib/cache";
import { db } from "@/lib/db";
import { productCategories, products } from "@/lib/db/schema";
import { handleApiError, NotFoundError, ValidationError } from "@/lib/errors";
import { createAdminGuard } from "@/lib/middleware";
import { requireModuleApi } from "@/lib/modules";

export async function GET(req: NextRequest) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;
    const moduleResult = await requireModuleApi("ecommerce");
    if (moduleResult) return moduleResult;

    const rows = await db.select().from(productCategories).orderBy(asc(productCategories.sortOrder), asc(productCategories.name));
    return NextResponse.json({ success: true, data: rows });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;
    const moduleResult = await requireModuleApi("ecommerce");
    if (moduleResult) return moduleResult;

    const body = await req.json();
    const name = String(body.name ?? "").trim();
    if (!name) throw new ValidationError("Category name is required");
    const slug = normalizeSlug(body.slug || name);
    const [row] = await db.insert(productCategories).values({
      name,
      slug,
      parentId: body.parentId || null,
      color: body.color || "#2D7D46",
      description: nullableText(body.description),
      seoTitle: nullableText(body.seoTitle),
      seoDescription: nullableText(body.seoDescription),
      sortOrder: parseInt(String(body.sortOrder ?? "0"), 10),
      isActive: body.isActive !== false,
    }).returning();
    await cacheInvalidate.products();
    return NextResponse.json({ success: true, data: row }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;
    const moduleResult = await requireModuleApi("ecommerce");
    if (moduleResult) return moduleResult;

    const body = await req.json();
    const id = String(body.id ?? "");
    if (!id) throw new ValidationError("Category id is required");
    const [existing] = await db.select().from(productCategories).where(eq(productCategories.id, id)).limit(1);
    if (!existing) throw new NotFoundError("Product category");

    await db.update(productCategories).set({
      name: body.name !== undefined ? String(body.name).trim() : existing.name,
      slug: body.slug !== undefined ? normalizeSlug(body.slug) : existing.slug,
      parentId: body.parentId !== undefined ? body.parentId || null : existing.parentId,
      color: body.color !== undefined ? String(body.color || "#2D7D46") : existing.color,
      description: body.description !== undefined ? nullableText(body.description) : existing.description,
      seoTitle: body.seoTitle !== undefined ? nullableText(body.seoTitle) : existing.seoTitle,
      seoDescription: body.seoDescription !== undefined ? nullableText(body.seoDescription) : existing.seoDescription,
      sortOrder: body.sortOrder !== undefined ? parseInt(String(body.sortOrder || "0"), 10) : existing.sortOrder,
      isActive: body.isActive !== undefined ? body.isActive === true : existing.isActive,
      updatedAt: new Date(),
    }).where(eq(productCategories.id, id));
    await cacheInvalidate.products();
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;
    const moduleResult = await requireModuleApi("ecommerce");
    if (moduleResult) return moduleResult;

    const id = req.nextUrl.searchParams.get("id") ?? "";
    if (!id) throw new ValidationError("Category id is required");
    const [usage] = await db.select({ count: sql<number>`count(*)` }).from(products).where(eq(products.categoryId, id));
    if (Number(usage?.count ?? 0) > 0) throw new ValidationError("Category is used by products");
    await db.delete(productCategories).where(eq(productCategories.id, id));
    await cacheInvalidate.products();
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}

function normalizeSlug(value: unknown): string {
  return slugify(String(value ?? ""), { lower: true, strict: true }).slice(0, 120);
}

function nullableText(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text ? text : null;
}
