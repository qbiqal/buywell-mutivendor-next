import type { Metadata } from "next";
import BlogEditorClient from "../BlogEditorClient";
import { requireModulePage } from "@/lib/modules";
export const metadata: Metadata = { title: "New Blog Post — Admin" };
export default async function NewBlogPostPage() {
  await requireModulePage("blog");
  return <BlogEditorClient />;
}
