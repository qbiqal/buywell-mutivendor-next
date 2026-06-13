export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import VendorProductsClient from "./VendorProductsClient";

export const metadata: Metadata = { title: "Products | Vendor Dashboard" };

export default function VendorProductsPage() {
  return <VendorProductsClient />;
}
