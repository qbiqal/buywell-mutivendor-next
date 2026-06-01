export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import AdminCustomerDetailClient from "./AdminCustomerDetailClient";
import { requireModulePage } from "@/lib/modules";

export const metadata: Metadata = { title: "Customer Detail | Admin" };

export default async function AdminCustomerDetailPage() {
  await requireModulePage("ecommerce");
  return <AdminCustomerDetailClient />;
}
