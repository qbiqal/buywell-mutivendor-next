import type { Metadata } from "next";
import { requireModulePage } from "@/lib/modules";
import RefundsClient from "./RefundsClient";

export const metadata: Metadata = { title: "Refunds" };

export default async function RefundsPage() {
  await requireModulePage("ecommerce");
  return <RefundsClient />;
}
