export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import VendorProductFormClient from "../VendorProductFormClient";

export const metadata: Metadata = { title: "Edit Product | Vendor Dashboard" };

export default async function VendorEditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <VendorProductFormClient productId={id} />;
}
