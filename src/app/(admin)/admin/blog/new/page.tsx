import type { Metadata } from "next";
import BlogEditorClient from "../BlogEditorClient";
export const metadata: Metadata = { title: "New Blog Post — Admin" };
export default function NewBlogPostPage() { return <BlogEditorClient />; }
