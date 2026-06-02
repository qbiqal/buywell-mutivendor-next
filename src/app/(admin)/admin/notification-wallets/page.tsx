export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTokenFromCookies, isQbiqalRole, verifyToken } from "@/lib/auth";
import NotificationWalletsClient from "./NotificationWalletsClient";

export const metadata: Metadata = { title: "Notification Wallets | Admin" };

export default async function NotificationWalletsPage() {
  const token = await getTokenFromCookies();
  const payload = token ? await verifyToken(token) : null;
  if (!isQbiqalRole(payload?.role)) redirect("/admin/dashboard");
  return <NotificationWalletsClient />;
}
