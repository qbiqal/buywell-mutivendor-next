import type { Metadata } from "next";
import AdminOrderDetailClient from "./AdminOrderDetailClient";
export const metadata: Metadata = { title: "Order Detail — Admin" };
export default function AdminOrderDetailPage() { return <AdminOrderDetailClient />; }
