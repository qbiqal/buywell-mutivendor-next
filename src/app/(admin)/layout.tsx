import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getTokenFromCookies, verifyToken } from "@/lib/auth";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import styles from "./admin.module.css";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const token = await getTokenFromCookies();
  if (!token) redirect("/login?redirect=/admin/dashboard");

  const payload = await verifyToken(token);
  if (!payload || payload.role !== "admin") redirect("/");

  return (
    <div className={styles.shell}>
      <AdminSidebar />
      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
}
