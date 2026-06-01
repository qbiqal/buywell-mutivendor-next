export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import ProfileClient from "./ProfileClient";
import { requireModulePage } from "@/lib/modules";
export const metadata: Metadata = { title: "My Profile — APRAS Naturals" };
export default async function ProfilePage() {
  await requireModulePage("ecommerce");
  return <ProfileClient />;
}
