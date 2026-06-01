import { cookies } from "next/headers";
import { getTokenFromCookies, verifyToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { CustomerHeader } from "@/components/layout/CustomerHeader";
import { Footer } from "@/components/layout/Footer";
import { ImpersonationBanner } from "@/components/admin/ImpersonationBanner";
import { getEnabledPublicNav, getModuleState } from "@/lib/modules";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  let user = null;

  // Check for active impersonation session
  const cookieStore = await cookies();
  const impersonationAdminToken = cookieStore.get("an_impersonate_admin")?.value ?? null;
  let impersonatedAs: string | null = null;
  if (impersonationAdminToken) {
    const adminPayload = await verifyToken(impersonationAdminToken);
    if (adminPayload?.role === "admin") {
      // Valid impersonation — get the current (customer) user email
      const token = await getTokenFromCookies();
      if (token) {
        const payload = await verifyToken(token);
        if (payload) impersonatedAs = payload.email;
      }
    }
  }

  const token = await getTokenFromCookies();
  if (token) {
    const payload = await verifyToken(token);
    if (payload) {
      const rows = await db
        .select({ firstName: users.firstName, email: users.email, role: users.role })
        .from(users)
        .where(eq(users.id, payload.sub));
      if (rows[0]) user = rows[0];
    }
  }
  const modules = await getModuleState();
  const navLinks = getEnabledPublicNav(modules);
  let cartSlot: React.ReactNode = null;
  if (modules.ecommerce) {
    const { EcommerceHeaderActions } = await import("@/components/shop/EcommerceHeaderActions");
    cartSlot = <EcommerceHeaderActions />;
  }

  return (
    <>
      {impersonatedAs && <ImpersonationBanner customerEmail={impersonatedAs} />}
      <CustomerHeader
        user={user}
        navLinks={navLinks}
        ecommerceEnabled={modules.ecommerce}
        cartSlot={cartSlot}
        topOffset={impersonatedAs ? 40 : 0}
      />
      <main style={{ paddingTop: impersonatedAs ? "calc(var(--header-height) + 40px)" : "var(--header-height)" }}>
        {children}
      </main>
      <Footer />
    </>
  );
}
