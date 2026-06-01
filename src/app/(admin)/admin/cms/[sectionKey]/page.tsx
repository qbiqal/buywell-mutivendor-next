export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import { requireModulePage } from "@/lib/modules";
import CMSSectionEditorClient from "./CMSSectionEditorClient";

export const metadata: Metadata = { title: "Edit CMS Section — Admin" };

export default async function CMSSectionEditorPage({ params }: { params: Promise<{ sectionKey: string }> }) {
  await requireModulePage("cms");
  const { sectionKey } = await params;
  return <CMSSectionEditorClient sectionKey={sectionKey} />;
}
