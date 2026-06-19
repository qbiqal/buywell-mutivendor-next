import { NextResponse, NextRequest } from "next/server";
import { db } from "@/lib/db";
import { productCategories, taxRates } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createAdminGuard } from "@/lib/middleware";
import { CATEGORIES } from "./category-seed-data";

export async function POST(req: NextRequest) {
  try {
    const adminRes = await createAdminGuard()(req);
    if (adminRes) return adminRes;

    // 1. Get tax rates to map gstRate to taxRateId
    const allTaxRates = await db.select().from(taxRates).where(eq(taxRates.isActive, true));
    const rateMap: Record<number, number> = {};
    for (const rate of allTaxRates) {
      const pct = Math.round(rate.totalRate / 100);
      if (!(pct in rateMap)) rateMap[pct] = rate.id;
    }
    // Special cases mapping
    for (const rate of allTaxRates) {
      if (rate.totalRate === 0) rateMap[0] = rate.id;
      if (rate.totalRate === 300) rateMap[3] = rate.id;
    }

    // 2. Wipe existing categories
    // This is safe because of ON DELETE SET NULL or cascade in related tables if set up,
    // but typically products are tied to categories. If the user wants a clean slate,
    // they might have products tied to old categories. We'll delete them anyway as requested.
    await db.delete(productCategories);

    let parentInserted = 0;
    let childInserted = 0;

    // 3. Insert new categories
    for (const cat of CATEGORIES as any[]) {
      const parentTaxRateId = rateMap[cat.gstRate ?? -1] ?? null;

      const [insertedParent] = await db.insert(productCategories).values({
        name: cat.name,
        slug: cat.slug,
        color: cat.color,
        description: cat.description ?? null,
        hsnCode: cat.hsnCode ?? null,
        taxRateId: parentTaxRateId,
        showOnHomepage: cat.showOnHomepage,
        showOnShop: cat.showOnShop,
        sortOrder: cat.sortOrder,
        isActive: true,
      }).returning({ id: productCategories.id });
      parentInserted++;

      if (cat.children && cat.children.length > 0) {
        for (const child of cat.children) {
          const childTaxRateId = rateMap[child.gstRate ?? -1] ?? null;
          await db.insert(productCategories).values({
            name: child.name,
            slug: child.slug,
            parentId: insertedParent.id,
            color: cat.color, // Inherit parent color
            hsnCode: child.hsnCode ?? null,
            taxRateId: childTaxRateId,
            showOnHomepage: false,
            showOnShop: true,
            sortOrder: child.sortOrder,
            isActive: true,
          });
          childInserted++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully wiped old categories and seeded ${parentInserted} parents and ${childInserted} children.`
    });
  } catch (error: any) {
    console.error("Failed to reset categories:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
