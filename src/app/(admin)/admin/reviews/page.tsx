import type { Metadata } from "next";
import { requireModulePage } from "@/lib/modules";
import ReviewsClient from "./ReviewsClient";

export const metadata: Metadata = { title: "Reviews" };

export default async function ReviewsPage() {
  await requireModulePage("ecommerce");
  return <ReviewsClient />;
}
