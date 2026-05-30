/**
 * WhatsApp notifications via Meta Cloud API.
 * Template messages are used for transactional order notifications.
 */

import { getSiteConfig } from "./config";

interface WAMessage {
  to: string;      // E.164 format: +919876543210
  message: string;
}

async function sendWhatsApp({ to, message }: WAMessage): Promise<boolean> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    console.warn("[whatsapp] Not configured — skipping notification");
    return false;
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: to.replace(/\s+/g, "").replace(/^\+/, ""),
          type: "text",
          text: { body: message },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("[whatsapp] API error:", err);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[whatsapp] Network error:", err);
    return false;
  }
}

// ── Order notification helpers ─────────────────────────────────────────────────

export async function notifyAdminNewOrder(params: {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  items: string;        // "Tulsi Honey 500g ×2, Karanj Honey 1kg ×1"
  totalFormatted: string; // "₹1,399"
  orderUrl: string;
}): Promise<boolean> {
  const adminNumber = (await getSiteConfig("whatsapp_admin_number")) ?? process.env.ADMIN_WHATSAPP_NUMBER;
  if (!adminNumber) return false;

  const message = `🆕 *New Order: ${params.orderNumber}*

👤 Customer: ${params.customerName} (${params.customerPhone})
🛍️ Items: ${params.items}
💰 Total: ${params.totalFormatted}
📸 Payment proof uploaded ✅

View order: ${params.orderUrl}`;

  return sendWhatsApp({ to: adminNumber, message });
}

export async function notifyCustomerOrderConfirmed(params: {
  phone: string;
  orderNumber: string;
  customerName: string;
}): Promise<boolean> {
  const message = `✅ *Order Confirmed!*

Hi ${params.customerName},

Your order *${params.orderNumber}* has been confirmed. We'll ship within 24–48 hours.

Thank you for choosing APRAS Naturals! 🍯

Questions? WhatsApp: ${process.env.ADMIN_WHATSAPP_NUMBER ?? "+919470309006"}`;

  return sendWhatsApp({ to: params.phone, message });
}

export async function notifyCustomerOrderShipped(params: {
  phone: string;
  orderNumber: string;
  customerName: string;
  trackingNumber?: string;
  courier?: string;
  estimatedDelivery?: string;
}): Promise<boolean> {
  const tracking = params.trackingNumber
    ? `\n📦 Tracking: *${params.trackingNumber}* (${params.courier ?? "Courier"})`
    : "";
  const delivery = params.estimatedDelivery
    ? `\n📅 Expected: ${params.estimatedDelivery}`
    : "";

  const message = `📦 *Your order is on its way!*

Hi ${params.customerName},

Order *${params.orderNumber}* has been shipped.${tracking}${delivery}

Thank you for choosing APRAS Naturals! 🍯`;

  return sendWhatsApp({ to: params.phone, message });
}

export async function notifyCustomerPaymentRejected(params: {
  phone: string;
  orderNumber: string;
  customerName: string;
  reason?: string;
}): Promise<boolean> {
  const message = `⚠️ *Payment Verification Issue*

Hi ${params.customerName},

We couldn't verify your payment for order *${params.orderNumber}*.${params.reason ? `\n\nReason: ${params.reason}` : ""}

Please re-upload a clear screenshot of your payment or contact us:
📞 ${process.env.ADMIN_WHATSAPP_NUMBER ?? "+919470309006"}`;

  return sendWhatsApp({ to: params.phone, message });
}
