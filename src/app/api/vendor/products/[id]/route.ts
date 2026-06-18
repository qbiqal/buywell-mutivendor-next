import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products, productImages, productVariants } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { createVendorGuard, getVendorForUser } from "@/lib/middleware";
import { sanitizeHtml } from "@/lib/sanitize";

async function getVendorProduct(vendorId: number, productId: string) {
  const [product] = await db.select().from(products)
    .where(and(eq(products.id, productId), eq(products.vendorId, vendorId)))
    .limit(1);
  return product ?? null;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await createVendorGuard()(req);
  if (authResult) return authResult;

  const vendor = await getVendorForUser(req);
  if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });

  const { id } = await params;
  const product = await getVendorProduct(vendor.id, id);
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const [images, variants] = await Promise.all([
    db.select().from(productImages).where(eq(productImages.productId, product.id)),
    db.select().from(productVariants).where(and(eq(productVariants.productId, product.id), eq(productVariants.isActive, true))),
  ]);

  return NextResponse.json({ success: true, product: { ...product, images, variants } });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await createVendorGuard()(req);
  if (authResult) return authResult;

  const vendor = await getVendorForUser(req);
  if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });

  const { id } = await params;
  const product = await getVendorProduct(vendor.id, id);
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const body = await req.json();
  const allowed = ["name","slug","category","description","sku","isActive","isFeatured","sortOrder"];
  const update: Record<string, unknown> = { updatedAt: new Date() };
  for (const key of allowed) {
    if (body[key] !== undefined) update[key] = body[key];
  }
  if (body.longDesc !== undefined) update.longDesc = body.longDesc ? sanitizeHtml(body.longDesc) : null;

  const [updated] = await db.update(products).set(update).where(eq(products.id, product.id)).returning();

  if (body.imageUrl !== undefined) {
    const url = body.imageUrl?.trim() ?? "";
    const [existing] = await db.select({ id: productImages.id })
      .from(productImages)
      .where(and(eq(productImages.productId, product.id), eq(productImages.isPrimary, true)))
      .limit(1);
    if (url) {
      if (existing) {
        await db.update(productImages).set({ url }).where(eq(productImages.id, existing.id));
      } else {
        await db.insert(productImages).values({ productId: product.id, url, isPrimary: true, sortOrder: 0 });
      }
    } else if (existing) {
      await db.delete(productImages).where(eq(productImages.id, existing.id));
    }
  }

  return NextResponse.json({ success: true, product: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await createVendorGuard()(req);
  if (authResult) return authResult;

  const vendor = await getVendorForUser(req);
  if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });

  const { id } = await params;
  const product = await getVendorProduct(vendor.id, id);
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  await db.update(products).set({ isActive: false, updatedAt: new Date() }).where(eq(products.id, product.id));
  return NextResponse.json({ success: true });
}
