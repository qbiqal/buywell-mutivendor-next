import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { vendors, products, productImages } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import VendorStoreClient from "./VendorStoreClient";
import { buildSeoMetadata } from "@/lib/seo";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const [vendor] = await db.select({
    storeName: vendors.storeName,
    storeDescription: vendors.storeDescription,
  }).from(vendors).where(and(eq(vendors.storeSlug, slug), eq(vendors.status, "approved")));

  if (!vendor) return {};

  return buildSeoMetadata(`/vendors/${slug}`, {
    title: `${vendor.storeName} | BuyWell Marketplace`,
    description: vendor.storeDescription || `Shop products from ${vendor.storeName} on BuyWell Marketplace.`,
  });
}

export default async function VendorStorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const [vendorRaw] = await db.select().from(vendors)
    .where(and(eq(vendors.storeSlug, slug), eq(vendors.status, "approved")));

  if (!vendorRaw) notFound();

  // Convert Date objects to strings for the client component
  const vendor = {
    ...vendorRaw,
    createdAt: vendorRaw.createdAt.toISOString(),
  };

  // Fetch vendor products
  const vendorProducts = await db.select({
    id:          products.id,
    name:        products.name,
    slug:        products.slug,
    category:    products.category,
    subCategory: products.subCategory,
    description: products.description,
    imageUrl:    productImages.url,
  })
  .from(products)
  .leftJoin(productImages, and(eq(productImages.productId, products.id), eq(productImages.isPrimary, true)))
  .where(and(eq(products.vendorId, vendor.id), eq(products.isActive, true)));

  return <VendorStoreClient vendor={vendor as any} products={vendorProducts} />;
}
