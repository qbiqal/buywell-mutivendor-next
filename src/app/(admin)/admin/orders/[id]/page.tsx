import type { Metadata } from "next";
import AdminOrderDetailClient from "./AdminOrderDetailClient";
import { requireModulePage } from "@/lib/modules";
export const metadata: Metadata = { title: "Order Detail — Admin" };
export default async function AdminOrderDetailPage() {
  await requireModulePage("ecommerce");
  return <AdminOrderDetailClient />;
}
