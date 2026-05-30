export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import AdminOrdersClient from "./AdminOrdersClient";
export const metadata: Metadata = { title: "Orders — Admin" };
export default function AdminOrdersPage() { return <AdminOrdersClient />; }
