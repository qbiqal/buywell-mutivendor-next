import { requireModulePage } from "@/lib/modules";
import AdminCommissionsClient from "./AdminCommissionsClient";

export const metadata = {
  title: "Commissions | BuyWell Admin",
};

export default async function AdminCommissionsPage() {
  await requireModulePage("ecommerce");
  return <AdminCommissionsClient />;
}
