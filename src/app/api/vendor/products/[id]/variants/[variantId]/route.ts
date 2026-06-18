import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products, productVariants } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { createVendorGuard, getVendorForUser } from "@/lib/middleware";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; variantId: string }> }
) {
  const authResult = await createVendorGuard()(req);
  if (authResult) return authResult;

  const vendor = await getVendorForUser(req);
  if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });

  const { id, variantId } = await params;
  const [product] = await db.select({ id: products.id })
    .from(products)
    .where(and(eq(products.id, id), eq(products.vendorId, vendor.id)))
    .limit(1);
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const body = await req.json();
  const update: Record<string, unknown> = {};
  if (body.name !== undefined) update.name = body.name;
  if (body.priceInr !== undefined) update.priceInr = Math.round(Number(body.priceInr));
  if (body.mrpInr !== undefined) update.mrpInr = body.mrpInr != null ? Math.round(Number(body.mrpInr)) : null;
  if (body.stock !== undefined) update.stock = Math.max(0, Math.round(Number(body.stock)));
  if (body.weight !== undefined) update.weight = body.weight || null;
  if (body.sku !== undefined) update.sku = body.sku;
  if (body.imageUrl !== undefined) update.imageUrl = body.imageUrl?.trim() || null;

  const [updated] = await db.update(productVariants)
    .set(update)
    .where(and(eq(productVariants.id, variantId), eq(productVariants.productId, product.id)))
    .returning();

  if (!updated) return NextResponse.json({ error: "Variant not found" }, { status: 404 });
  return NextResponse.json({ success: true, variant: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; variantId: string }> }
) {
  const authResult = await createVendorGuard()(req);
  if (authResult) return authResult;

  const vendor = await getVendorForUser(req);
  if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });

  const { id, variantId } = await params;
  const [product] = await db.select({ id: products.id })
    .from(products)
    .where(and(eq(products.id, id), eq(products.vendorId, vendor.id)))
    .limit(1);
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  await db.update(productVariants)
    .set({ isActive: false })
    .where(and(eq(productVariants.id, variantId), eq(productVariants.productId, product.id)));

  return NextResponse.json({ success: true });
}
