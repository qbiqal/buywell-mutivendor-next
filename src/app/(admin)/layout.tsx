import { redirect } from "next/navigation";
import { getTokenFromCookies, isAdminRole, verifyToken } from "@/lib/auth";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { getAllSiteConfig } from "@/lib/config";
import { getEnabledAdminNav, getModuleState } from "@/lib/modules";
import styles from "./admin.module.css";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const token = await getTokenFromCookies();
  if (!token) redirect("/login?redirect=/admin/dashboard");

  const payload = await verifyToken(token);
  if (!payload || !isAdminRole(payload.role)) redirect("/");
  const [modules, generalConfig] = await Promise.all([
    getModuleState(),
    getAllSiteConfig("general"),
  ]);
  const navItems = getEnabledAdminNav(modules, payload.role);

  return (
    <div className={styles.shell}>
      <AdminSidebar
        navItems={navItems}
        logoUrl={generalConfig.admin_logo_url || generalConfig.site_logo_url || ""}
        siteName={generalConfig.site_name || "BuyWell"}
      />
      <main className={styles.main}>
        <AdminTopbar />
        {children}
      </main>
    </div>
  );
}
