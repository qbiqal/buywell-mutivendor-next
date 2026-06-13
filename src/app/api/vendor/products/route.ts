import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products, productImages } from "@/lib/db/schema";
import { eq, and, desc, ilike, asc } from "drizzle-orm";
import { createVendorGuard, getVendorForUser } from "@/lib/middleware";
import { sanitizeHtml } from "@/lib/sanitize";

export async function GET(req: NextRequest) {
  const authResult = await createVendorGuard()(req);
  if (authResult) return authResult;

  const vendor = await getVendorForUser(req);
  if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");
  const status = searchParams.get("status");

  const where = and(
    eq(products.vendorId, vendor.id),
    status === "active" ? eq(products.isActive, true) :
    status === "inactive" ? eq(products.isActive, false) : undefined,
    search ? ilike(products.name, `%${search}%`) : undefined,
  );

  const rows = await db.select({
    id: products.id, name: products.name, slug: products.slug,
    category: products.category, isActive: products.isActive,
    isFeatured: products.isFeatured, sortOrder: products.sortOrder,
    createdAt: products.createdAt, sku: products.sku,
    imageUrl: productImages.url,
  })
  .from(products)
  .leftJoin(productImages, and(eq(productImages.productId, products.id), eq(productImages.isPrimary, true)))
  .where(where)
  .orderBy(desc(products.createdAt));

  // De-dup (left join can produce multiple rows)
  const seen = new Set<string>();
  const list = rows.filter((r) => { if (seen.has(r.id)) return false; seen.add(r.id); return true; });

  return NextResponse.json({ success: true, products: list });
}

export async function POST(req: NextRequest) {
  const authResult = await createVendorGuard()(req);
  if (authResult) return authResult;

  const vendor = await getVendorForUser(req);
  if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });

  const body = await req.json();
  const { name, slug, category, description, longDesc, sku } = body;
  if (!name?.trim() || !slug?.trim() || !category?.trim() || !sku?.trim()) {
    return NextResponse.json({ error: "name, slug, category, sku are required" }, { status: 400 });
  }

  const [product] = await db.insert(products).values({
    name: name.trim(),
    slug: slug.trim(),
    category: category.trim(),
    description: description?.trim() || null,
    longDesc: longDesc ? sanitizeHtml(longDesc) : null,
    sku: sku.trim(),
    vendorId: vendor.id,
  }).returning();

  return NextResponse.json({ success: true, product }, { status: 201 });
}
