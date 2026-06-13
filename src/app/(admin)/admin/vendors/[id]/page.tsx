export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import AdminVendorDetailClient from "./AdminVendorDetailClient";

export const metadata: Metadata = { title: "Vendor Detail | Admin" };

export default async function AdminVendorDetailPage({ params }: { params: { id: string } }) {
  return <AdminVendorDetailClient id={params.id} />;
}
