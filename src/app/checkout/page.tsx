export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import CheckoutClient from "./CheckoutClient";
import { CustomerHeader } from "@/components/layout/CustomerHeader";
import { getTokenFromCookies, verifyToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
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
  return (
    <>
      <CustomerHeader user={user} />
      <main style={{ paddingTop: "var(--header-height)" }}>
        <CheckoutClient />
      </main>
    </>
  );
}
