export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import CheckoutClient from "./CheckoutClient";
import { CustomerHeader } from "@/components/layout/CustomerHeader";
import { getTokenFromCookies, verifyToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, addresses } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSiteConfig } from "@/lib/config";
import { getEnabledPublicNav, getModuleState, requireModulePage } from "@/lib/modules";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  await requireModulePage("ecommerce");

  let user = null;
  let savedAddress = null;
  const token = await getTokenFromCookies();
  if (token) {
    const payload = await verifyToken(token);
    if (payload) {
      const [row] = await db.select({ firstName: users.firstName, email: users.email, role: users.role })
        .from(users).where(eq(users.id, payload.sub));
      if (row) user = row;

      // Fetch default or most-recent saved address
      const saved = await db.select().from(addresses)
        .where(eq(addresses.userId, payload.sub))
        .orderBy(desc(addresses.isDefault))
        .limit(1);
      if (saved[0]) savedAddress = saved[0];
    }
  }

  const bwalletEnabled  = (await getSiteConfig("payment_bwallet_enabled")) === "true";
  const razorpayEnabled = (await getSiteConfig("payment_razorpay_enabled")) === "true"
    && !!(await getSiteConfig("payment_razorpay_key_id"));
  const offlineEnabled  = (await getSiteConfig("payment_offline_enabled")) !== "false";
  const razorpayKeyId   = (await getSiteConfig("payment_razorpay_key_id")) ?? "";
  const companyName     = (await getSiteConfig("payment_company_name")) ?? "BuyWell";

  const modules  = await getModuleState();
  const navLinks = getEnabledPublicNav(modules);

  return (
    <>
      <CustomerHeader user={user} navLinks={navLinks} ecommerceEnabled={modules.ecommerce} />
      <main style={{ paddingTop: "var(--header-height)" }}>
        <CheckoutClient
          savedAddress={savedAddress}
          bwalletEnabled={bwalletEnabled}
          razorpayEnabled={razorpayEnabled}
          offlineEnabled={offlineEnabled}
          razorpayKeyId={razorpayKeyId}
          companyName={companyName}
          isLoggedIn={user !== null}
        />
      </main>
    </>
  );
}
