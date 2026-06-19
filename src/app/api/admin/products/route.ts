import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { contentTags, products, productVariants, productImages, vendors } from "@/lib/db/schema";
import { eq, and, asc, ilike, or, sql, desc, gte, lte, isNull, inArray, type SQL } from "drizzle-orm";
import { createAdminGuard } from "@/lib/middleware";
import { handleApiError, ValidationError } from "@/lib/errors";
import { invalidateByPrefix } from "@/lib/cache";
import { requireModuleApi } from "@/lib/modules";
import { sanitizeHtml } from "@/lib/sanitize";

function numberParam(value: string | null) {
  if (!value || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(req: NextRequest) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;
    const moduleResult = await requireModuleApi("ecommerce");
    if (moduleResult) return moduleResult;

    const { searchParams } = req.nextUrl;
    const search        = searchParams.get("search");
    const category      = searchParams.get("category");
    const categoryIdFilter = searchParams.get("categoryId");
    const vendorFilter  = searchParams.get("vendor");
    const status        = searchParams.get("status");
    const featured = searchParams.get("featured");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo   = searchParams.get("dateTo");
    const minPrice = numberParam(searchParams.get("minPrice"));
    const maxPrice = numberParam(searchParams.get("maxPrice"));
    const minStock = numberParam(searchParams.get("minStock"));
    const maxStock = numberParam(searchParams.get("maxStock"));
    const page     = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit    = Math.min(50, parseInt(searchParams.get("limit") ?? "20"));
    const offset   = (page - 1) * limit;

    const conditions: SQL[] = [];
    if (category) conditions.push(eq(products.category, category));
    if (categoryIdFilter) conditions.push(eq(products.categoryId, categoryIdFilter));
    if (vendorFilter === "admin") conditions.push(isNull(products.vendorId));
    else if (vendorFilter) { const vid = parseInt(vendorFilter); if (!isNaN(vid)) conditions.push(eq(products.vendorId, vid)); }
    if (status === "active") conditions.push(eq(products.isActive, true));
    if (status === "inactive") conditions.push(eq(products.isActive, false));
    if (featured === "true") conditions.push(eq(products.isFeatured, true));
    if (featured === "false") conditions.push(eq(products.isFeatured, false));
    if (dateFrom) conditions.push(gte(products.createdAt, new Date(`${dateFrom}T00:00:00.000Z`)));
    if (dateTo) conditions.push(lte(products.createdAt, new Date(`${dateTo}T23:59:59.999Z`)));
    if (minPrice !== null) {
      const paise = Math.round(minPrice * 100);
      conditions.push(sql`exists (select 1 from product_variants pv where pv.product_id = ${products.id} and pv.price_inr >= ${paise})`);
    }
    if (maxPrice !== null) {
      const paise = Math.round(maxPrice * 100);
      conditions.push(sql`exists (select 1 from product_variants pv where pv.product_id = ${products.id} and pv.price_inr <= ${paise})`);
    }
    if (minStock !== null) {
      conditions.push(sql`exists (select 1 from product_variants pv where pv.product_id = ${products.id} and pv.stock >= ${minStock})`);
    }
    if (maxStock !== null) {
      conditions.push(sql`exists (select 1 from product_variants pv where pv.product_id = ${products.id} and pv.stock <= ${maxStock})`);
    }
    if (search) {
      conditions.push(or(
        ilike(products.name, `%${search}%`),
        ilike(products.sku,  `%${search}%`),
      ) as SQL);
    }

    const [rows, countRows] = await Promise.all([
      db.select().from(products)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(asc(products.sortOrder), desc(products.createdAt))
        .limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(products)
        .where(conditions.length > 0 ? and(...conditions) : undefined),
    ]);

    // Attach variants + images for each product
    const withImages = await Promise.all(rows.map(async (p) => {
      const [variants, images] = await Promise.all([
        db.select().from(productVariants).where(eq(productVariants.productId, p.id)).orderBy(asc(productVariants.sortOrder)),
        db.select().from(productImages).where(eq(productImages.productId, p.id)).orderBy(asc(productImages.sortOrder)).limit(1),
      ]);
      return { ...p, variants, images };
    }));

    // Batch-fetch vendor names for all products that have a vendorId
    const vendorIds = [...new Set(withImages.map((p) => p.vendorId).filter((id): id is number => id != null))];
    const vendorMap = new Map<number, { storeName: string | null; storeSlug: string | null }>();
    if (vendorIds.length > 0) {
      const vendorRows = await db.select({ id: vendors.id, storeName: vendors.storeName, storeSlug: vendors.storeSlug })
        .from(vendors)
        .where(inArray(vendors.id, vendorIds));
      for (const v of vendorRows) vendorMap.set(v.id, { storeName: v.storeName, storeSlug: v.storeSlug });
    }
    const withVendors = withImages.map((p) => {
      const v = p.vendorId != null ? vendorMap.get(p.vendorId) : undefined;
      return { ...p, vendorName: v?.storeName ?? null, vendorStoreSlug: v?.storeSlug ?? null };
    });

    const total = Number(countRows[0]?.count ?? 0);
    return NextResponse.json({
      success: true,
      data: withVendors,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
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
    const {
      name, slug, category, categoryId, subCategory, description, longDesc, sku,
      isActive, isFeatured, sortOrder, metaTitle, metaDesc, seoKeywords,
      ogImageUrl, canonicalUrl, noIndex, noFollow, tags, variants = [], images = [],
      hsnCode, taxRateId,
    } = body;

    if (!name || !slug || !sku) {
      throw new ValidationError("name, slug and sku are required");
    }

    const productId = crypto.randomUUID();

    await db.insert(products).values({
      id: productId,
      name, slug, category: category || "other",
      categoryId: categoryId || null,
      subCategory: subCategory || null,
      description: description || null,
      longDesc: longDesc ? sanitizeHtml(longDesc) : null,
      sku,
      isActive: isActive ?? true,
      isFeatured: isFeatured ?? false,
      sortOrder: sortOrder ?? 0,
      metaTitle: metaTitle || null,
      metaDesc: metaDesc || null,
      seoKeywords: parseList(seoKeywords),
      ogImageUrl: nullableText(ogImageUrl),
      canonicalUrl: nullableText(canonicalUrl),
      noIndex: noIndex === true,
      noFollow: noFollow === true,
      tags: parseList(tags),
      hsnCode: hsnCode || null,
      taxRateId: taxRateId ? Number(taxRateId) : null,
    });
    await ensureTags("product", parseList(tags));

    // Insert variants
    if (variants.length > 0) {
      await db.insert(productVariants).values(
        variants.map((v: Record<string, unknown>, i: number) => ({
          id: crypto.randomUUID(),
          productId,
          name: v.name as string,
          priceInr: v.priceInr as number,
          mrpInr: (v.mrpInr as number) || null,
          weight: (v.weight as string) || null,
          stock: (v.stock as number) ?? 0,
          sku: v.sku as string,
          isActive: true,
          sortOrder: i,
        }))
      );
    }

    // Insert images
    if (images.length > 0) {
      await db.insert(productImages).values(
        images.map((img: Record<string, unknown>, i: number) => ({
          id: crypto.randomUUID(),
          productId,
          url: img.url as string,
          alt: (img.alt as string) || null,
          isPrimary: i === 0,
          sortOrder: i,
        }))
      );
    }

    await invalidateByPrefix("query:products:");
    await invalidateByPrefix("query:product:");

    const result = await db.select().from(products).where(eq(products.id, productId));
    return NextResponse.json({ success: true, data: result[0] }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

function nullableText(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text ? text : null;
}

function parseList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  return String(value ?? "").split(",").map((item) => item.trim()).filter(Boolean);
}

async function ensureTags(moduleKey: string, names: string[]) {
  for (const name of names) {
    const slug = `${moduleKey}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`.slice(0, 120);
    if (!slug) continue;
    await db.insert(contentTags).values({
      name,
      slug,
      moduleKey,
      color: colorForName(name),
    }).onConflictDoNothing();
  }
}

function colorForName(value: string): string {
  const colors = ["#D97706", "#16A34A", "#2563EB", "#C026D3", "#DC2626", "#0891B2"];
  const sum = Array.from(value).reduce((total, char) => total + char.charCodeAt(0), 0);
  return colors[sum % colors.length];
}
