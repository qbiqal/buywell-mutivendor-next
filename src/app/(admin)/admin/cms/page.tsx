import type { Metadata } from "next";
import CMSClient from "./CMSClient";
export const metadata: Metadata = { title: "CMS — Admin" };
export default function CMSPage() { return <CMSClient />; }
