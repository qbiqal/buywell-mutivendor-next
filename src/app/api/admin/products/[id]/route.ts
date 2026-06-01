import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products, productVariants, productImages, orderItems } from "@/lib/db/schema";
import { and, eq, asc, notInArray, sql } from "drizzle-orm";
import { createAdminGuard } from "@/lib/middleware";
import { handleApiError, NotFoundError } from "@/lib/errors";
import { invalidateByPrefix } from "@/lib/cache";
import { requireModuleApi } from "@/lib/modules";
import { sanitizeHtml } from "@/lib/sanitize";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;
    const moduleResult = await requireModuleApi("ecommerce");
    if (moduleResult) return moduleResult;

    const { id } = await params;
    const rows = await db.select().from(products).where(eq(products.id, id));
    if (!rows[0]) throw new NotFoundError("Product");

    const [variants, images] = await Promise.all([
      db.select().from(productVariants).where(eq(productVariants.productId, id)).orderBy(asc(productVariants.sortOrder)),
      db.select().from(productImages).where(eq(productImages.productId, id)).orderBy(asc(productImages.sortOrder)),
    ]);

    return NextResponse.json({ success: true, data: { ...rows[0], variants, images } });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;
    const moduleResult = await requireModuleApi("ecommerce");
    if (moduleResult) return moduleResult;

    const { id } = await params;
    const rows = await db.select().from(products).where(eq(products.id, id));
    if (!rows[0]) throw new NotFoundError("Product");

    const body = await req.json();
    const { name, slug, category, subCategory, description, longDesc, sku, isActive, isFeatured, sortOrder, metaTitle, metaDesc, variants, images } = body;

    // Update product
    await db.update(products).set({
      ...(name        !== undefined && { name }),
      ...(slug        !== undefined && { slug }),
      ...(category    !== undefined && { category }),
      ...(subCategory !== undefined && { subCategory: subCategory || null }),
      ...(description !== undefined && { description: description || null }),
      ...(longDesc    !== undefined && { longDesc: longDesc ? sanitizeHtml(longDesc) : null }),
      ...(sku         !== undefined && { sku }),
      ...(isActive    !== undefined && { isActive }),
      ...(isFeatured  !== undefined && { isFeatured }),
      ...(sortOrder   !== undefined && { sortOrder }),
      ...(metaTitle   !== undefined && { metaTitle: metaTitle || null }),
      ...(metaDesc    !== undefined && { metaDesc: metaDesc || null }),
      updatedAt: new Date(),
    }).where(eq(products.id, id));

    // Replace variants if provided
    if (variants !== undefined) {
      const existingVariants = await db
        .select({ id: productVariants.id })
        .from(productVariants)
        .where(eq(productVariants.productId, id));
      const existingIds = new Set(existingVariants.map((v) => v.id));
      const keptIds: string[] = [];

      for (const [i, v] of (variants as Record<string, unknown>[]).entries()) {
        const requestedVariantId = typeof v.id === "string" && v.id ? v.id : "";
        const variantId = requestedVariantId && existingIds.has(requestedVariantId)
          ? requestedVariantId
          : crypto.randomUUID();
        const values = {
          productId: id,
          name: v.name as string,
          priceInr: v.priceInr as number,
          mrpInr: (v.mrpInr as number) || null,
          weight: (v.weight as string) || null,
          stock: (v.stock as number) ?? 0,
          sku: v.sku as string,
          isActive: (v.isActive as boolean) ?? true,
          sortOrder: i,
        };

        if (existingIds.has(variantId)) {
          keptIds.push(variantId);
          await db.update(productVariants).set(values).where(eq(productVariants.id, variantId));
        } else {
          keptIds.push(variantId);
          await db.insert(productVariants).values({ id: variantId, ...values });
        }
      }

      if (keptIds.length > 0) {
        await db.update(productVariants)
          .set({ isActive: false })
          .where(and(eq(productVariants.productId, id), notInArray(productVariants.id, keptIds)));
      } else {
        await db.update(productVariants)
          .set({ isActive: false })
          .where(eq(productVariants.productId, id));
      }
    }

    // Replace images if provided
    if (images !== undefined) {
      await db.delete(productImages).where(eq(productImages.productId, id));
      if (images.length > 0) {
        await db.insert(productImages).values(
          images.map((img: Record<string, unknown>, i: number) => ({
            id: (img.id as string) || crypto.randomUUID(),
            productId: id,
            url: img.url as string,
            alt: (img.alt as string) || null,
            isPrimary: i === 0,
            sortOrder: i,
          }))
        );
      }
    }

    await invalidateByPrefix("query:products:");
    await invalidateByPrefix(`query:product:${rows[0].slug}`);

    const updated = await db.select().from(products).where(eq(products.id, id));
    return NextResponse.json({ success: true, data: updated[0] });
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
    const moduleResult = await requireModuleApi("ecommerce");
    if (moduleResult) return moduleResult;

    const { id } = await params;
    const rows = await db.select({ slug: products.slug }).from(products).where(eq(products.id, id));
    if (!rows[0]) throw new NotFoundError("Product");

    const usage = await db
      .select({ count: sql<number>`count(*)` })
      .from(orderItems)
      .innerJoin(productVariants, eq(productVariants.id, orderItems.variantId))
      .where(eq(productVariants.productId, id));
    const usedInOrders = Number(usage[0]?.count ?? 0) > 0;

    if (usedInOrders) {
      await Promise.all([
        db.update(products).set({ isActive: false, updatedAt: new Date() }).where(eq(products.id, id)),
        db.update(productVariants).set({ isActive: false }).where(eq(productVariants.productId, id)),
      ]);
    } else {
      await db.delete(products).where(eq(products.id, id));
    }

    await invalidateByPrefix("query:products:");
    await invalidateByPrefix(`query:product:${rows[0].slug}`);

    return NextResponse.json({ success: true, data: { archived: usedInOrders } });
  } catch (err) {
    return handleApiError(err);
  }
}
