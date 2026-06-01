export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import AdminProductsClient from "./AdminProductsClient";
import { requireModulePage } from "@/lib/modules";
export const metadata: Metadata = { title: "Products — Admin" };
export default async function AdminProductsPage() {
  await requireModulePage("ecommerce");
  return <AdminProductsClient />;
}
