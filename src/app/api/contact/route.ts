import { NextRequest, NextResponse } from "next/server";
import { handleApiError, ValidationError } from "@/lib/errors";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { getAllSiteConfig } from "@/lib/config";
import { sendEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const ip  = getClientIp(req);
    const rl  = await rateLimit({ key: `contact:${ip}`, limit: 3, windowSeconds: 3600 });
    if (!rl.allowed) return NextResponse.json({ success: false, error: "Too many submissions. Please try again later." }, { status: 429 });

    const body    = await req.json();
    const name    = String(body.name    ?? "").trim();
    const email   = String(body.email   ?? "").trim();
    const phone   = String(body.phone   ?? "").trim();
    const subject = String(body.subject ?? "").trim() || "General Enquiry";
    const message = String(body.message ?? "").trim();

    if (!name)                         throw new ValidationError("Name is required");
    if (!email || !email.includes("@")) throw new ValidationError("Valid email is required");
    if (!message)                      throw new ValidationError("Message is required");

    const config     = await getAllSiteConfig("general");
    const adminEmail = config.site_email ?? "support@buywell.in";

    await sendEmail({
      to: adminEmail,
      subject: `New Contact: ${subject} — ${name}`,
      html: `
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone || "Not provided"}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <hr/>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, "<br/>")}</p>
        <hr/>
        <p style="color:#666;font-size:12px">Submitted via buywell.in contact form</p>
      `,
    }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
