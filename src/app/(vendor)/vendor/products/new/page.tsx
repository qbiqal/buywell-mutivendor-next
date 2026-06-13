export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import VendorProductFormClient from "../VendorProductFormClient";

export const metadata: Metadata = { title: "Add Product | Vendor Dashboard" };

export default function VendorNewProductPage() {
  return <VendorProductFormClient />;
}
