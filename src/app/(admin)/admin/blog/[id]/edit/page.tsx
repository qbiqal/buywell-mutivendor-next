import type { Metadata } from "next";
import BlogEditorClient from "../../BlogEditorClient";
export const metadata: Metadata = { title: "Edit Blog Post — Admin" };
export default function EditBlogPostPage({ params }: { params: { id: string } }) {
  return <BlogEditorClient postId={params.id} />;
}
