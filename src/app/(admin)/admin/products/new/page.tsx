export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import ProductFormClient from "../ProductFormClient";
import { requireModulePage } from "@/lib/modules";
export const metadata: Metadata = { title: "Add Product — Admin" };
export default async function NewProductPage() {
  await requireModulePage("ecommerce");
  return <ProductFormClient mode="new" />;
}
