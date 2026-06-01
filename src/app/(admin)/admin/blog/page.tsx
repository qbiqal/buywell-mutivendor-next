export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import AdminBlogClient from "./AdminBlogClient";
import { requireModulePage } from "@/lib/modules";
export const metadata: Metadata = { title: "Blog — Admin" };
export default async function AdminBlogPage() {
  await requireModulePage("blog");
  return <AdminBlogClient />;
}
