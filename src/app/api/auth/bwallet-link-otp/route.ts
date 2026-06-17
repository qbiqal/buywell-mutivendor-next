import { NextRequest, NextResponse } from "next/server";
import { getTokenFromCookies, verifyToken } from "@/lib/auth";
import { bwalletGateway } from "@/lib/payment/bwallet";

export async function POST(req: NextRequest) {
  const token = await getTokenFromCookies();
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { identifier, type, channel } = await req.json();
    
    // 1. Lookup user in BuyWell Global
    const lookup = await bwalletGateway.lookupUser(identifier, type);
    if (!lookup.found) {
      return NextResponse.json({ success: false, error: "USER_NOT_FOUND" });
    }

    // 2. Send OTP
    await bwalletGateway.sendLinkOtp(lookup.bw_user_id, channel || "sms");

    return NextResponse.json({ 
      success: true, 
      bwUserId: lookup.bw_user_id,
      name: lookup.name 
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
