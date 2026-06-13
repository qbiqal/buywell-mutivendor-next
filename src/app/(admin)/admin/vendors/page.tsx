export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import AdminVendorsClient from "./AdminVendorsClient";

export const metadata: Metadata = { title: "Vendors | Admin" };

export default async function AdminVendorsPage() {
  return <AdminVendorsClient />;
}
