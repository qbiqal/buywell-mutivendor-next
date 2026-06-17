export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import ShopClient from "./ShopClient";
import { requireModulePage } from "@/lib/modules";

export const metadata: Metadata = {
  title: "Shop — BuyWell Online Shopping India",
  description: "Explore thousands of products across Fashion, Electronics, Health & Beauty, Home & Kitchen and more. Best prices. Fast delivery. Shop at BuyWell.",
};

export default async function ShopPage() {
  await requireModulePage("ecommerce");
  return <ShopClient />;
}
