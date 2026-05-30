import type { Metadata } from "next";
import PaymentClient from "./PaymentClient";
import { CustomerHeader } from "@/components/layout/CustomerHeader";
import { getTokenFromCookies, verifyToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSiteConfig } from "@/lib/config";

export const metadata: Metadata = { title: "Complete Payment" };

export default async function PaymentPage() {
  let user = null;
  const token = await getTokenFromCookies();
  if (token) {
    const payload = await verifyToken(token);
    if (payload) {
      const rows = await db.select({ firstName: users.firstName, email: users.email, role: users.role })
        .from(users).where(eq(users.id, payload.sub));
      if (rows[0]) user = rows[0];
    }
  }

  const qrUrl      = (await getSiteConfig("payment_qr_url")) ?? "";
  const upiId      = (await getSiteConfig("payment_upi_id")) ?? "";
  const companyName = (await getSiteConfig("payment_company_name")) ?? "APRAS Naturals";

  return (
    <>
      <CustomerHeader user={user} />
      <main style={{ paddingTop: "var(--header-height)" }}>
        <PaymentClient qrUrl={qrUrl} upiId={upiId} companyName={companyName} />
      </main>
    </>
  );
}
