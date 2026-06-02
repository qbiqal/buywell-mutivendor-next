import { requireModulePage } from "@/lib/modules";
import AdminCMSPagesClient from "./AdminCMSPagesClient";

export const dynamic = "force-dynamic";

export default async function AdminCMSPagesPage() {
  await requireModulePage("cms");
  return <AdminCMSPagesClient />;
}
