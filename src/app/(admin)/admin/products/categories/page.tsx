export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import AdminCategoriesClient from "./AdminCategoriesClient";
import { requireModulePage } from "@/lib/modules";
export const metadata: Metadata = { title: "Product Categories — Admin" };
export default async function AdminCategoriesPage() {
  await requireModulePage("ecommerce");
  return <AdminCategoriesClient />;
}
