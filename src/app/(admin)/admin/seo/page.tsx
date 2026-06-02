import { requireModulePage } from "@/lib/modules";
import AdminSEOClient from "./AdminSEOClient";

export const dynamic = "force-dynamic";

export default async function AdminSEOPage() {
  await requireModulePage("seo");
  return <AdminSEOClient />;
}
