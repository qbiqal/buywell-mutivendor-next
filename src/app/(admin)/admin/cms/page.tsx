export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import CMSClient from "./CMSClient";
import { requireModulePage } from "@/lib/modules";
export const metadata: Metadata = { title: "CMS — Admin" };
export default async function CMSPage() {
  await requireModulePage("cms");
  return <CMSClient />;
}
