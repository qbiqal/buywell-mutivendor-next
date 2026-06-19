export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { productCategories } from "@/lib/db/schema";
import { asc, eq, isNull } from "drizzle-orm";
import { withCache, CACHE_TTL } from "@/lib/cache";
import CategoriesClient from "./CategoriesClient";

export const metadata: Metadata = {
  title: "All Categories — BuyWell",
  description:
    "Explore all product categories on BuyWell — Food & Grocery, Ayurveda, Personal Care, Electronics, Fashion and more. GST-compliant, verified Indian sellers.",
};

export default async function CategoriesPage() {
  const allCategories = await withCache("query:categories:all-tree", CACHE_TTL.QUERY, async () =>
    db.select({
      id:          productCategories.id,
      name:        productCategories.name,
      slug:        productCategories.slug,
      parentId:    productCategories.parentId,
      color:       productCategories.color,
      description: productCategories.description,
      sortOrder:   productCategories.sortOrder,
      isActive:    productCategories.isActive,
    })
    .from(productCategories)
    .where(eq(productCategories.isActive, true))
    .orderBy(asc(productCategories.sortOrder), asc(productCategories.name))
  );

  const parents  = allCategories.filter((c) => !c.parentId);
  const children = allCategories.filter((c) => !!c.parentId);

  return <CategoriesClient parents={parents} children={children} />;
}
