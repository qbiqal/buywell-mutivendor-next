export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import VendorProductFormClient from "../VendorProductFormClient";

export const metadata: Metadata = { title: "Edit Product | Vendor Dashboard" };

export default function VendorEditProductPage({ params }: { params: { id: string } }) {
  return <VendorProductFormClient productId={params.id} />;
}
