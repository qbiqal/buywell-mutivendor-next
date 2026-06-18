import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products, productVariants } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { createVendorGuard, getVendorForUser } from "@/lib/middleware";

async function getVendorProduct(vendorId: number, productId: string) {
  const [product] = await db.select({ id: products.id })
    .from(products)
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

  const variants = await db.select().from(productVariants)
    .where(and(eq(productVariants.productId, product.id), eq(productVariants.isActive, true)));

  return NextResponse.json({ success: true, variants });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await createVendorGuard()(req);
  if (authResult) return authResult;

  const vendor = await getVendorForUser(req);
  if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });

  const { id } = await params;
  const product = await getVendorProduct(vendor.id, id);
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const body = await req.json();
  const { name, priceInr, mrpInr, stock, weight, sku } = body;

  if (!name?.trim() || !sku?.trim() || priceInr == null || stock == null) {
    return NextResponse.json({ error: "name, sku, priceInr, stock are required" }, { status: 400 });
  }
  const price = Math.round(Number(priceInr));
  const mrp   = mrpInr != null ? Math.round(Number(mrpInr)) : null;
  if (isNaN(price) || price <= 0) return NextResponse.json({ error: "Invalid price" }, { status: 400 });

  const [variant] = await db.insert(productVariants).values({
    productId: product.id,
    name: name.trim(),
    priceInr: price,
    mrpInr: mrp ?? undefined,
    stock: Math.max(0, Math.round(Number(stock))),
    weight: weight?.trim() || null,
    sku: sku.trim(),
  }).returning();

  return NextResponse.json({ success: true, variant }, { status: 201 });
}
