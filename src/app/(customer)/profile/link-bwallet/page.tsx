import { getTokenFromCookies, verifyToken } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import LinkBwalletClient from "./LinkBwalletClient";

export default async function LinkBwalletPage() {
  const token = await getTokenFromCookies();
  const payload = token ? await verifyToken(token) : null;
  if (!payload) redirect("/login?callback=/profile/link-bwallet");

  const [user] = await db.select().from(users).where(eq(users.id, (payload as any).userId));
  if (!user) redirect("/login");

  if (user.bwUserId) {
    redirect("/profile");
  }

  return <LinkBwalletClient />;
}
