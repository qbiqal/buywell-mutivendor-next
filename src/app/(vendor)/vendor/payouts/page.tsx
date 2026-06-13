export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import VendorPayoutsClient from "./VendorPayoutsClient";

export const metadata: Metadata = { title: "Payouts | Vendor Dashboard" };

export default function VendorPayoutsPage() {
  return <VendorPayoutsClient />;
}
