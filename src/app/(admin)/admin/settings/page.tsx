export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import AdminSettingsClient from "./AdminSettingsClient";
export const metadata: Metadata = { title: "Settings — Admin" };
export default function SettingsPage() { return <AdminSettingsClient />; }
