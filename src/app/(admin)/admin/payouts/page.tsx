export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import AdminPayoutsClient from "./AdminPayoutsClient";

export const metadata: Metadata = { title: "Vendor Payouts | Admin" };

export default function AdminPayoutsPage() {
  return <AdminPayoutsClient />;
}
