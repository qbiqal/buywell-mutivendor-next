export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import AdminWhatsAppClient from "./AdminWhatsAppClient";

export const metadata: Metadata = { title: "WhatsApp | Admin" };

export default function AdminWhatsAppPage() {
  return <AdminWhatsAppClient />;
}
