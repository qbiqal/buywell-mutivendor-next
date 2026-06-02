import { requireModulePage } from "@/lib/modules";
import MenuManagerClient from "./MenuManagerClient";

export const dynamic = "force-dynamic";

export default async function MenuManagerPage() {
  await requireModulePage("cms");
  return <MenuManagerClient />;
}
