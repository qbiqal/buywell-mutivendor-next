import type { Metadata } from "next";
import AdminDashboardClient from "./AdminDashboardClient";
export const metadata: Metadata = { title: "Admin Dashboard" };
export default function AdminDashboardPage() { return <AdminDashboardClient />; }
