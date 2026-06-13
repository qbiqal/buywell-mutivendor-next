export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import VendorSettingsClient from "./VendorSettingsClient";

export const metadata: Metadata = { title: "Store Settings | Vendor Dashboard" };

export default function VendorSettingsPage() {
  return <VendorSettingsClient />;
}
