/**
 * Email delivery via Resend (primary) or SMTP (fallback).
 * Provider configured in site_config: email_provider = resend | smtp
 */

import { getSiteConfig } from "./config";

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

async function sendViaResend(options: EmailOptions): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const fromEmail = options.from ?? (await getSiteConfig("site_email")) ?? "noreply@aprasnaturals.com";
  const fromName = (await getSiteConfig("site_name")) ?? "APRAS Naturals";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  // Currently using Resend — add SMTP fallback later via site_config
  const sent = await sendViaResend(options);
  if (!sent) {
    console.warn("[email] Failed to send email to:", options.to);
  }
  return sent;
}

// ── Email templates ────────────────────────────────────────────────────────────

export async function sendOrderConfirmationEmail(params: {
  to: string;
  customerName: string;
  orderNumber: string;
  items: string;
  total: string;
  appUrl: string;
}): Promise<boolean> {
  return sendEmail({
    to: params.to,
    subject: `Order Confirmed — ${params.orderNumber} | APRAS Naturals`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #D97706; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: #fff; margin: 0; font-size: 24px;">🍯 APRAS Naturals</h1>
        </div>
        <div style="padding: 32px; background: #fff; border: 1px solid #eee;">
          <h2 style="color: #18110a;">Order Confirmed ✅</h2>
          <p>Hi ${params.customerName},</p>
          <p>Your order <strong>${params.orderNumber}</strong> has been confirmed. We'll ship within 24–48 hours.</p>
          <div style="background: #FEF3C7; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <strong>Items:</strong> ${params.items}<br/>
            <strong>Total:</strong> ${params.total}
          </div>
          <a href="${params.appUrl}/orders" style="display:inline-block; background:#D97706; color:#fff; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:bold;">
            Track Your Order
          </a>
        </div>
        <p style="text-align:center; color:#999; font-size:12px; padding:16px;">
          © APRAS Naturals · Authorized Prakvedaa Partner · Ranchi, Jharkhand
        </p>
      </div>
    `,
  });
}
