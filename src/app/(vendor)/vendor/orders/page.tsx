export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import VendorOrdersClient from "./VendorOrdersClient";

export const metadata: Metadata = { title: "Orders | Vendor Dashboard" };

export default function VendorOrdersPage() {
  return <VendorOrdersClient />;
}
