/**
 * WhatsApp notifications via Meta Cloud API.
 * Local/dev without Meta credentials logs messages as "skipped" instead of failing.
 */

import { eq } from "drizzle-orm";
import { getAllSiteConfig, getSiteConfig } from "./config";
import { db } from "./db";
import { orders, whatsappLogs } from "./db/schema";

export type WhatsAppDeliveryStatus = "sent" | "skipped" | "failed";

export interface WhatsAppSendResult {
  success: boolean;
  status: WhatsAppDeliveryStatus;
  configured: boolean;
  providerMessageId?: string;
  error?: string;
}

interface WAMessage {
  to: string;
  message: string;
}

export const WHATSAPP_TEMPLATE_KEYS = [
  "manual",
  "order_confirmed",
  "order_shipped",
  "payment_rejected",
  "admin_new_order",
] as const;

export type WhatsAppTemplateKey = typeof WHATSAPP_TEMPLATE_KEYS[number];

export const DEFAULT_WHATSAPP_TEMPLATES: Record<WhatsAppTemplateKey, string> = {
  manual: "Hi {{customerName}},\n\n{{message}}\n\n- APRAS Naturals",
  order_confirmed: "Hi {{customerName}},\n\nYour order {{orderNumber}} has been confirmed. We will ship within 24-48 hours.\n\nThank you for choosing APRAS Naturals.",
  order_shipped: "Hi {{customerName}},\n\nYour order {{orderNumber}} has been shipped.{{trackingLine}}{{deliveryLine}}\n\nThank you for choosing APRAS Naturals.",
  payment_rejected: "Hi {{customerName}},\n\nWe could not verify payment for order {{orderNumber}}.{{reasonLine}}\n\nPlease upload a clear payment screenshot or contact us.",
  admin_new_order: "New order {{orderNumber}}\nCustomer: {{customerName}} ({{customerPhone}})\nItems: {{items}}\nTotal: {{totalFormatted}}\nView: {{orderUrl}}",
};

export interface WhatsAppConfig {
  enabled: boolean;
  orderNotify: boolean;
  adminNumber: string;
  phoneNumberId: string;
  accessToken: string;
  templates: Record<WhatsAppTemplateKey, string>;
}

export async function getWhatsAppConfig(): Promise<WhatsAppConfig> {
  const config = await getAllSiteConfig("whatsapp");
  return {
    enabled: config.whatsapp_enabled !== "false",
    orderNotify: config.whatsapp_order_notify !== "false",
    adminNumber: config.whatsapp_admin_number ?? process.env.ADMIN_WHATSAPP_NUMBER ?? "",
    phoneNumberId: config.whatsapp_phone_number_id || process.env.WHATSAPP_PHONE_NUMBER_ID || "",
    accessToken: config.whatsapp_access_token || process.env.WHATSAPP_ACCESS_TOKEN || "",
    templates: WHATSAPP_TEMPLATE_KEYS.reduce((templates, key) => {
      templates[key] = config[`whatsapp_template_${key}`] ?? DEFAULT_WHATSAPP_TEMPLATES[key];
      return templates;
    }, {} as Record<WhatsAppTemplateKey, string>),
  };
}

export function renderWhatsAppTemplate(template: string, values: Record<string, string | number | null | undefined>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    const value = values[key];
    return value === null || value === undefined ? "" : String(value);
  });
}

export async function sendWhatsAppAndLog(params: {
  to: string;
  message: string;
  templateKey: string;
  recipientName?: string | null;
  orderId?: string | null;
  sentBy?: string | null;
}): Promise<WhatsAppSendResult & { logId: string }> {
  const result = await sendWhatsApp({ to: params.to, message: params.message });
  const [log] = await db.insert(whatsappLogs).values({
    orderId: params.orderId ?? null,
    templateKey: params.templateKey,
    recipientPhone: normalizePhone(params.to),
    recipientName: params.recipientName ?? null,
    message: params.message,
    status: result.status,
    providerMessageId: result.providerMessageId ?? null,
    error: result.error ?? null,
    sentBy: params.sentBy ?? null,
  }).returning({ id: whatsappLogs.id });

  if (params.orderId && result.success) {
    await db.update(orders).set({ whatsappSentAt: new Date() }).where(eq(orders.id, params.orderId));
  }

  return { ...result, logId: log.id };
}

async function sendWhatsApp({ to, message }: WAMessage): Promise<WhatsAppSendResult> {
  const config = await getWhatsAppConfig();
  if (!config.enabled) {
    return { success: false, status: "skipped", configured: false, error: "WhatsApp is disabled" };
  }

  const phoneNumberId = config.phoneNumberId;
  const accessToken = config.accessToken;

  if (!phoneNumberId || !accessToken) {
    return { success: false, status: "skipped", configured: false, error: "WhatsApp credentials are not configured" };
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
          to: normalizePhone(to).replace(/^\+/, ""),
          type: "text",
          text: { body: message },
        }),
      },
    );

    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      const error = typeof payload?.error?.message === "string"
        ? payload.error.message
        : `WhatsApp API error: ${res.status}`;
      console.error("[whatsapp] API error:", payload);
      return { success: false, status: "failed", configured: true, error };
    }

    return {
      success: true,
      status: "sent",
      configured: true,
      providerMessageId: payload?.messages?.[0]?.id,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : "WhatsApp network error";
    console.error("[whatsapp] Network error:", err);
    return { success: false, status: "failed", configured: true, error };
  }
}

function normalizePhone(phone: string): string {
  return phone.replace(/\s+/g, "");
}

// ── Order notification helpers ─────────────────────────────────────────────────

export async function notifyAdminNewOrder(params: {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  items: string;
  totalFormatted: string;
  orderUrl: string;
}): Promise<boolean> {
  const [adminNumber, config] = await Promise.all([
    getSiteConfig("whatsapp_admin_number"),
    getWhatsAppConfig(),
  ]);
  const to = adminNumber ?? config.adminNumber;
  if (!to || !config.orderNotify) return false;

  const message = renderWhatsAppTemplate(config.templates.admin_new_order, params);
  const result = await sendWhatsApp({ to, message });
  return result.success;
}

export async function notifyCustomerOrderConfirmed(params: {
  phone: string;
  orderNumber: string;
  customerName: string;
}): Promise<boolean> {
  const config = await getWhatsAppConfig();
  if (!config.orderNotify) return false;
  const message = renderWhatsAppTemplate(config.templates.order_confirmed, params);
  const result = await sendWhatsApp({ to: params.phone, message });
  return result.success;
}

export async function notifyCustomerOrderShipped(params: {
  phone: string;
  orderNumber: string;
  customerName: string;
  trackingNumber?: string;
  courier?: string;
  estimatedDelivery?: string;
}): Promise<boolean> {
  const config = await getWhatsAppConfig();
  if (!config.orderNotify) return false;
  const message = renderWhatsAppTemplate(config.templates.order_shipped, {
    ...params,
    trackingLine: params.trackingNumber ? `\nTracking: ${params.trackingNumber} (${params.courier ?? "Courier"})` : "",
    deliveryLine: params.estimatedDelivery ? `\nExpected: ${params.estimatedDelivery}` : "",
  });
  const result = await sendWhatsApp({ to: params.phone, message });
  return result.success;
}

export async function notifyCustomerPaymentRejected(params: {
  phone: string;
  orderNumber: string;
  customerName: string;
  reason?: string;
}): Promise<boolean> {
  const config = await getWhatsAppConfig();
  if (!config.orderNotify) return false;
  const message = renderWhatsAppTemplate(config.templates.payment_rejected, {
    ...params,
    reasonLine: params.reason ? `\nReason: ${params.reason}` : "",
  });
  const result = await sendWhatsApp({ to: params.phone, message });
  return result.success;
}
