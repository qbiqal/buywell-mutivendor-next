import { redirect } from "next/navigation";
import { getTokenFromCookies, verifyToken } from "@/lib/auth";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { getEnabledAdminNav, getModuleState } from "@/lib/modules";
import styles from "./admin.module.css";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const token = await getTokenFromCookies();
  if (!token) redirect("/login?redirect=/admin/dashboard");

  const payload = await verifyToken(token);
  if (!payload || payload.role !== "admin") redirect("/");
  const modules = await getModuleState();
  const navItems = getEnabledAdminNav(modules);

  return (
    <div className={styles.shell}>
      <AdminSidebar navItems={navItems} />
      <main className={styles.main}>
        <AdminTopbar />
        {children}
      </main>
    </div>
  );
}
