export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import AdminAnalyticsClient from "./AdminAnalyticsClient";
import { requireModulePage } from "@/lib/modules";

export const metadata: Metadata = { title: "Analytics | Admin" };

export default async function AdminAnalyticsPage() {
  await requireModulePage("ecommerce");
  return <AdminAnalyticsClient />;
}
