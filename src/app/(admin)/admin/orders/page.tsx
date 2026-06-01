export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import AdminOrdersClient from "./AdminOrdersClient";
import { requireModulePage } from "@/lib/modules";
export const metadata: Metadata = { title: "Orders — Admin" };
export default async function AdminOrdersPage() {
  await requireModulePage("ecommerce");
  return <AdminOrdersClient />;
}
