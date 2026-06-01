export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import OrderDetailClient from "./OrderDetailClient";
import { requireModulePage } from "@/lib/modules";
export const metadata: Metadata = { title: "Order Details" };
export default async function OrderDetailPage() {
  await requireModulePage("ecommerce");
  return <OrderDetailClient />;
}
