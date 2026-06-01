export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import AdminMediaClient from "./AdminMediaClient";

export const metadata: Metadata = { title: "Media Library | Admin" };

export default function AdminMediaPage() {
  return <AdminMediaClient />;
}
