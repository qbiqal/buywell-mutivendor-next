export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import AdminDashboardClient from "./AdminDashboardClient";
import { getModuleState } from "@/lib/modules";
export const metadata: Metadata = { title: "Admin Dashboard" };
export default async function AdminDashboardPage() {
  const modules = await getModuleState();
  return <AdminDashboardClient modules={modules} />;
}
