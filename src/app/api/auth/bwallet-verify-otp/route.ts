import { NextRequest, NextResponse } from "next/server";
import { getTokenFromCookies, verifyToken } from "@/lib/auth";
import { bwalletGateway } from "@/lib/payment/bwallet";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const token = await getTokenFromCookies();
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { bwUserId, otp } = await req.json();

    // 1. Verify OTP with BuyWell Global
    const verify = await bwalletGateway.verifyLinkOtp(bwUserId, otp);
    if (!verify.success) {
      return NextResponse.json({ success: false, error: "INVALID_OTP" });
    }

    // 2. Store link in local DB
    await db.update(users).set({
      bwUserId: bwUserId,
      bwLinkedAt: new Date(),
    }).where(eq(users.id, (payload as any).userId));

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
