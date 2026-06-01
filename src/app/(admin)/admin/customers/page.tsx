export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import AdminCustomersClient from "./AdminCustomersClient";
import { requireModulePage } from "@/lib/modules";

export const metadata: Metadata = { title: "Customers | Admin" };

export default async function AdminCustomersPage() {
  await requireModulePage("ecommerce");
  return <AdminCustomersClient />;
}
