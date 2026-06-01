import ConfirmationClient from "./ConfirmationClient";
import { requireModulePage } from "@/lib/modules";

export default async function ConfirmationPage() {
  await requireModulePage("ecommerce");
  return <ConfirmationClient />;
}
