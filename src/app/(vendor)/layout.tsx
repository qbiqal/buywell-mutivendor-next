import { redirect } from "next/navigation";
import { getTokenFromCookies, verifyToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { vendors } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { VendorSidebar } from "@/components/layout/VendorSidebar";
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import styles from "./vendor.module.css";

export default async function VendorLayout({ children }: { children: React.ReactNode }) {
  const token = await getTokenFromCookies();
  if (!token) redirect("/login?redirect=/vendor/dashboard");

  const payload = await verifyToken(token);
  if (!payload) redirect("/login?redirect=/vendor/dashboard");

  // Admins can access vendor panel (for support)
  const isAdmin = payload.role === "admin" || payload.role === "qbiqal";
  if (!isAdmin && payload.role !== "vendor") redirect("/");

  let vendorName = "My Store";
  let vendorStatus = "approved";
  if (!isAdmin) {
    const [vendor] = await db.select({ storeName: vendors.storeName, status: vendors.status, storeSlug: vendors.storeSlug })
      .from(vendors).where(eq(vendors.userId, payload.sub)).limit(1);
    if (!vendor) redirect("/become-vendor");
    if (vendor.status !== "approved") redirect("/become-vendor");
    vendorName = vendor.storeName;
    vendorStatus = vendor.status;
  }

  return (
    <div className={styles.shell}>
      <VendorSidebar storeName={vendorName} />
      <main className={styles.main}>
        <AdminTopbar />
        {children}
      </main>
    </div>
  );
}
