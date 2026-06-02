import { cookies } from "next/headers";
import { getTokenFromCookies, verifyToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { CustomerHeader } from "@/components/layout/CustomerHeader";
import { Footer } from "@/components/layout/Footer";
import { ImpersonationBanner } from "@/components/admin/ImpersonationBanner";
import { getPublicMenus } from "@/lib/cms";
import { getAllSiteConfig } from "@/lib/config";
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
  const [modules, menus, generalConfig] = await Promise.all([
    getModuleState(),
    getPublicMenus(),
    getAllSiteConfig("general"),
  ]);
  const navLinks = getEnabledPublicNav(modules);
  const landingNavLinks = menus.landing_header.length > 0 ? menus.landing_header : navLinks;
  const siteNavLinks = menus.site_header.length > 0 ? menus.site_header : navLinks;
  const footerLinks = menus.footer.length > 0 ? menus.footer : undefined;
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
        landingNavLinks={landingNavLinks}
        siteNavLinks={siteNavLinks}
        ecommerceEnabled={modules.ecommerce}
        cartSlot={cartSlot}
        topOffset={impersonatedAs ? 40 : 0}
        logoUrl={generalConfig.site_logo_url || ""}
        siteName={generalConfig.site_name || "APRAS Naturals"}
      />
      <main style={{ paddingTop: impersonatedAs ? "calc(var(--header-height) + 40px)" : "var(--header-height)" }}>
        {children}
      </main>
      <Footer
        links={footerLinks}
        logoUrl={generalConfig.site_logo_url || ""}
        siteName={generalConfig.site_name || "APRAS Naturals"}
        tagline={generalConfig.site_tagline || undefined}
        email={generalConfig.site_email || undefined}
        phone={generalConfig.site_phone || undefined}
        address={generalConfig.site_address || undefined}
      />
    </>
  );
}
