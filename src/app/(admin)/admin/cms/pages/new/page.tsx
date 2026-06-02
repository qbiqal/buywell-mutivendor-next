import { requireModulePage } from "@/lib/modules";
import CMSPageEditorClient from "../CMSPageEditorClient";

export const dynamic = "force-dynamic";

export default async function NewCMSPage() {
  await requireModulePage("cms");
  return <CMSPageEditorClient />;
}
