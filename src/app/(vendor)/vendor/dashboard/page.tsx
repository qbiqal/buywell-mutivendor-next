export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import VendorDashboardClient from "./VendorDashboardClient";

export const metadata: Metadata = { title: "Vendor Dashboard | BuyWell" };

export default function VendorDashboardPage() {
  return <VendorDashboardClient />;
}
