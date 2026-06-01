export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import ProductFormClient from "../../ProductFormClient";
import { requireModulePage } from "@/lib/modules";
export const metadata: Metadata = { title: "Edit Product — Admin" };
export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  await requireModulePage("ecommerce");
  const { id } = await params;
  return <ProductFormClient mode="edit" productId={id} />;
}
