import { requireModulePage } from "@/lib/modules";
import CMSPageEditorClient from "../../CMSPageEditorClient";

export const dynamic = "force-dynamic";

export default async function EditCMSPage({ params }: { params: Promise<{ id: string }> }) {
  await requireModulePage("cms");
  const { id } = await params;
  return <CMSPageEditorClient pageId={id} />;
}
