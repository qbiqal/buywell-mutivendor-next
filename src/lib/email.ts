/**
 * Email delivery via Resend (primary) or SMTP (fallback).
 * Provider configured in site_config: email_provider = resend | smtp
 */

import { sendEmailNotification } from "./notifications";

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  userId?: string | null;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const result = await sendEmailNotification(options);
  if (!result.success && result.status !== "skipped") {
    console.warn("[email] Failed to send email to:", options.to);
  }
  return result.success;
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
    subject: `Order Confirmed — ${params.orderNumber} | BuyWell Marketplace`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #0d7659; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: #fff; margin: 0; font-size: 24px;">🛒 BuyWell Online Shopping India</h1>
        </div>
        <div style="padding: 32px; background: #fff; border: 1px solid #eee;">
          <h2 style="color: #18110a;">Order Confirmed ✅</h2>
          <p>Hi ${params.customerName},</p>
          <p>Your order <strong>${params.orderNumber}</strong> has been confirmed. We'll ship within 24–48 hours.</p>
          <div style="background: #f0fdf4; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <strong>Items:</strong> ${params.items}<br/>
            <strong>Total:</strong> ${params.total}
          </div>
          <a href="${params.appUrl}/orders" style="display:inline-block; background:#0d7659; color:#fff; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:bold;">
            Track Your Order
          </a>
        </div>
        <p style="text-align:center; color:#999; font-size:12px; padding:16px;">
          © BuyWell Online Shopping India Pvt Ltd · Bheemanpadi, Kottayam, Kerala – 686003
        </p>
      </div>
    `,
  });
}
