export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import OrdersClient from "./OrdersClient";
import { requireModulePage } from "@/lib/modules";
export const metadata: Metadata = { title: "My Orders" };
export default async function OrdersPage() {
  await requireModulePage("ecommerce");
  return <OrdersClient />;
}
