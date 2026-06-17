import { NextRequest, NextResponse } from "next/server";
import { getTokenFromCookies, verifyToken } from "@/lib/auth";
import { bwalletGateway } from "@/lib/payment/bwallet";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const token = await getTokenFromCookies();
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const [user] = await db.select({ bwUserId: users.bwUserId }).from(users).where(eq(users.id, payload.sub));
    if (!user?.bwUserId) {
      return NextResponse.json({ success: true, linked: false });
    }

    const balance = await bwalletGateway.getBalance(user.bwUserId);
    return NextResponse.json({ success: true, linked: true, balance });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
