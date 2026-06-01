import type { Metadata } from "next";
import BlogEditorClient from "../../BlogEditorClient";
import { requireModulePage } from "@/lib/modules";
export const metadata: Metadata = { title: "Edit Blog Post — Admin" };
export default async function EditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  await requireModulePage("blog");
  const { id } = await params;
  return <BlogEditorClient postId={id} />;
}
