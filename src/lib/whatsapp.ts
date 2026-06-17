/**
 * WhatsApp notifications via WAHA or Meta Cloud API.
 * Local/dev without provider credentials logs messages as "skipped" instead of failing.
 */

import { eq } from "drizzle-orm";
import { getAllSiteConfig, getSiteConfig } from "./config";
import { db } from "./db";
import { orders, whatsappLogs } from "./db/schema";
import { debitNotificationWallet, reverseNotificationDebit } from "./notification-wallet";

export type WhatsAppDeliveryStatus = "sent" | "skipped" | "failed";

export interface WhatsAppSendResult {
  success: boolean;
  status: WhatsAppDeliveryStatus;
  configured: boolean;
  provider: "waha" | "meta";
  providerMessageId?: string;
  walletTransactionId?: string;
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
  manual: "Hi {{customerName}},\n\n{{message}}\n\n- BuyWell Marketplace",
  order_confirmed: "Hi {{customerName}},\n\nYour order {{orderNumber}} has been confirmed. We will ship within 24-48 hours.\n\nThank you for choosing BuyWell Marketplace.",
  order_shipped: "Hi {{customerName}},\n\nYour order {{orderNumber}} has been shipped.{{trackingLine}}{{deliveryLine}}\n\nThank you for choosing BuyWell Marketplace.",
  payment_rejected: "Hi {{customerName}},\n\nWe could not verify payment for order {{orderNumber}}.{{reasonLine}}\n\nPlease upload a clear payment screenshot or contact us.",
  admin_new_order: "New order {{orderNumber}}\nCustomer: {{customerName}} ({{customerPhone}})\nItems: {{items}}\nTotal: {{totalFormatted}}\nView: {{orderUrl}}",
};

export interface WhatsAppConfig {
  enabled: boolean;
  orderNotify: boolean;
  adminNumber: string;
  provider: "waha" | "meta";
  wahaBaseUrl: string;
  wahaSession: string;
  wahaApiKey: string;
  wahaChatSuffix: string;
  phoneNumberId: string;
  accessToken: string;
  templates: Record<WhatsAppTemplateKey, string>;
}

export async function getWhatsAppConfig(): Promise<WhatsAppConfig> {
  const [config, notificationConfig] = await Promise.all([
    getAllSiteConfig("whatsapp"),
    getAllSiteConfig("notification"),
  ]);
  const provider = normalizeProvider(config.whatsapp_provider || process.env.WHATSAPP_PROVIDER || "waha");
  return {
    enabled: config.whatsapp_enabled !== "false" && notificationConfig.notification_whatsapp_enabled !== "false",
    orderNotify: config.whatsapp_order_notify !== "false",
    adminNumber: config.whatsapp_admin_number ?? process.env.ADMIN_WHATSAPP_NUMBER ?? "",
    provider,
    wahaBaseUrl: config.whatsapp_waha_base_url || process.env.WAHA_BASE_URL || "https://whatsapp-gateway.qbiqal.com/",
    wahaSession: config.whatsapp_waha_session || process.env.WAHA_SESSION || "default",
    wahaApiKey: config.whatsapp_waha_api_key || process.env.WAHA_API_KEY || process.env.WHATSAPP_API_KEY || "",
    wahaChatSuffix: config.whatsapp_waha_chat_suffix || process.env.WAHA_CHAT_SUFFIX || "@c.us",
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
    provider: result.provider,
    providerMessageId: result.providerMessageId ?? null,
    walletTransactionId: result.walletTransactionId ?? null,
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
  const provider = config.provider;
  if (!config.enabled) {
    return { success: false, status: "skipped", configured: false, provider, error: "WhatsApp is disabled" };
  }

  const missingProviderConfig = provider === "waha"
    ? (!config.wahaBaseUrl || !config.wahaSession)
    : (!config.phoneNumberId || !config.accessToken);

  if (missingProviderConfig) {
    return { success: false, status: "skipped", configured: false, provider, error: "WhatsApp provider credentials are not configured" };
  }

  const debit = await debitNotificationWallet({
    channel: "whatsapp",
    credits: 1,
    reason: "WhatsApp notification send",
    referenceType: "whatsapp",
    referenceId: normalizePhone(to),
  });

  if (!debit.success) {
    return {
      success: false,
      status: "skipped",
      configured: false,
      provider,
      error: debit.error,
    };
  }

  const result = provider === "waha"
    ? await sendViaWaha(config, { to, message }, debit.transactionId)
    : await sendViaMeta(config, { to, message }, debit.transactionId);

  if (!result.success) {
    await reverseNotificationDebit({
      channel: "whatsapp",
      debitTransactionId: debit.transactionId,
      reason: `WhatsApp ${provider} send failed: ${result.error ?? "unknown error"}`,
    }).catch(() => {});
  }

  return result;
}

async function sendViaMeta(config: WhatsAppConfig, { to, message }: WAMessage, walletTransactionId: string): Promise<WhatsAppSendResult> {
  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${config.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
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
      return { success: false, status: "failed", configured: true, provider: "meta", walletTransactionId, error };
    }

    return {
      success: true,
      status: "sent",
      configured: true,
      provider: "meta",
      providerMessageId: payload?.messages?.[0]?.id,
      walletTransactionId,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : "WhatsApp network error";
    console.error("[whatsapp] Network error:", err);
    return { success: false, status: "failed", configured: true, provider: "meta", walletTransactionId, error };
  }
}

async function sendViaWaha(config: WhatsAppConfig, { to, message }: WAMessage, walletTransactionId: string): Promise<WhatsAppSendResult> {
  const baseUrl = config.wahaBaseUrl.replace(/\/+$/, "");
  const headers: Record<string, string> = {
    "Accept": "application/json",
    "Content-Type": "application/json",
  };
  if (config.wahaApiKey) headers["X-Api-Key"] = config.wahaApiKey;

  try {
    const res = await fetch(`${baseUrl}/api/sendText`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        session: config.wahaSession,
        chatId: toWahaChatId(to, config.wahaChatSuffix),
        text: message,
      }),
    });

    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      const error = typeof payload?.message === "string"
        ? payload.message
        : typeof payload?.error === "string"
          ? payload.error
          : `WAHA API error: ${res.status}`;
      console.error("[whatsapp:waha] API error:", payload);
      return { success: false, status: "failed", configured: true, provider: "waha", walletTransactionId, error };
    }

    return {
      success: true,
      status: "sent",
      configured: true,
      provider: "waha",
      providerMessageId: extractProviderMessageId(payload),
      walletTransactionId,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : "WAHA network error";
    console.error("[whatsapp:waha] Network error:", err);
    return { success: false, status: "failed", configured: true, provider: "waha", walletTransactionId, error };
  }
}

function normalizePhone(phone: string): string {
  return phone.replace(/\s+/g, "");
}

function normalizeProvider(provider: string): "waha" | "meta" {
  return provider === "meta" ? "meta" : "waha";
}

function toWahaChatId(phone: string, suffix: string): string {
  const normalized = normalizePhone(phone);
  if (normalized.includes("@")) return normalized;
  return `${normalized.replace(/[^\d]/g, "")}${suffix || "@c.us"}`;
}

function extractProviderMessageId(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const obj = payload as Record<string, unknown>;
  if (typeof obj.id === "string") return obj.id;
  if (typeof obj.messageId === "string") return obj.messageId;
  const nested = obj._data;
  if (nested && typeof nested === "object" && typeof (nested as Record<string, unknown>).id === "string") {
    return (nested as Record<string, string>).id;
  }
  return undefined;
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
