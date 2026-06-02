import type { Metadata } from "next";
import { requireModulePage } from "@/lib/modules";
import BlogCommentsClient from "./BlogCommentsClient";

export const metadata: Metadata = { title: "Blog Comments" };

export default async function BlogCommentsPage() {
  await requireModulePage("blog");
  return <BlogCommentsClient />;
}
