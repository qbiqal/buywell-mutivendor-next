import { getTokenFromCookies, verifyToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { CustomerHeader } from "@/components/layout/CustomerHeader";
import { Footer } from "@/components/layout/Footer";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  let user = null;

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

  return (
    <>
      <CustomerHeader user={user} />
      <main style={{ paddingTop: "var(--header-height)" }}>
        {children}
      </main>
      <Footer />
    </>
  );
}
