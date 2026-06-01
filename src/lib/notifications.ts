import { db } from "./db";
import { notifications, notificationDeliveries } from "./db/schema";
import { getAllSiteConfig } from "./config";

export type NotificationChannel = "in_app" | "email" | "sms" | "whatsapp" | "telegram" | "push";
export type NotificationStatus = "sent" | "skipped" | "failed";

export interface NotificationDeliveryResult {
  success: boolean;
  status: NotificationStatus;
  channel: NotificationChannel;
  provider: string;
  configured: boolean;
  providerMessageId?: string;
  error?: string;
}

export interface EmailNotificationOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  userId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface NotificationConfig {
  inAppEnabled: boolean;
  emailEnabled: boolean;
  emailProvider: "resend" | string;
  emailFrom: string;
  resendEnabled: boolean;
  resendApiKey: string;
  smsEnabled: boolean;
  smsProvider: string;
  smsApiKey: string;
  smsSenderId: string;
  smsAuthToken: string;
  whatsappEnabled: boolean;
  telegramEnabled: boolean;
  telegramBotToken: string;
  telegramChatId: string;
  pushEnabled: boolean;
  pushProvider: string;
  pushVapidPublicKey: string;
  pushVapidPrivateKey: string;
  pushVapidSubject: string;
}

function boolConfig(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value !== "false";
}

export async function getNotificationConfig(): Promise<NotificationConfig> {
  const [notificationConfig, siteConfig] = await Promise.all([
    getAllSiteConfig("notification"),
    getAllSiteConfig("general"),
  ]);
  const siteEmail = siteConfig.site_email ?? "noreply@aprasnaturals.com";
  const siteName = siteConfig.site_name ?? "APRAS Naturals";

  return {
    inAppEnabled: boolConfig(notificationConfig.notification_in_app_enabled, true),
    emailEnabled: boolConfig(notificationConfig.notification_email_enabled, true),
    emailProvider: notificationConfig.notification_email_provider ?? "resend",
    emailFrom: notificationConfig.notification_email_from || `${siteName} <${siteEmail}>`,
    resendEnabled: boolConfig(notificationConfig.notification_resend_enabled, true),
    resendApiKey: notificationConfig.notification_resend_api_key || process.env.RESEND_API_KEY || "",
    smsEnabled: notificationConfig.notification_sms_enabled === "true",
    smsProvider: notificationConfig.notification_sms_provider ?? "",
    smsApiKey: notificationConfig.notification_sms_api_key || process.env.SMS_API_KEY || "",
    smsSenderId: notificationConfig.notification_sms_sender_id || process.env.SMS_SENDER_ID || "",
    smsAuthToken: notificationConfig.notification_sms_auth_token || process.env.SMS_AUTH_TOKEN || "",
    whatsappEnabled: boolConfig(notificationConfig.notification_whatsapp_enabled, true),
    telegramEnabled: notificationConfig.notification_telegram_enabled === "true",
    telegramBotToken: notificationConfig.notification_telegram_bot_token || process.env.TELEGRAM_BOT_TOKEN || "",
    telegramChatId: notificationConfig.notification_telegram_chat_id || process.env.TELEGRAM_CHAT_ID || "",
    pushEnabled: notificationConfig.notification_push_enabled === "true",
    pushProvider: notificationConfig.notification_push_provider ?? "web_push",
    pushVapidPublicKey: notificationConfig.notification_push_vapid_public_key || process.env.WEB_PUSH_VAPID_PUBLIC_KEY || "",
    pushVapidPrivateKey: notificationConfig.notification_push_vapid_private_key || process.env.WEB_PUSH_VAPID_PRIVATE_KEY || "",
    pushVapidSubject: notificationConfig.notification_push_vapid_subject || process.env.WEB_PUSH_VAPID_SUBJECT || "",
  };
}

export async function createInAppNotification(params: {
  userId: string;
  type: string;
  title: string;
  body: string;
  link?: string | null;
}): Promise<string | null> {
  const config = await getNotificationConfig();
  if (!config.inAppEnabled) {
    await logNotificationDelivery({
      userId: params.userId,
      channel: "in_app",
      provider: "local",
      recipient: params.userId,
      subject: params.title,
      body: params.body,
      status: "skipped",
      error: "In-app notifications are disabled",
    });
    return null;
  }

  const [row] = await db.insert(notifications).values({
    userId: params.userId,
    type: params.type,
    title: params.title,
    body: params.body,
    link: params.link ?? null,
  }).returning({ id: notifications.id });

  await logNotificationDelivery({
    notificationId: row.id,
    userId: params.userId,
    channel: "in_app",
    provider: "local",
    recipient: params.userId,
    subject: params.title,
    body: params.body,
    status: "sent",
  });

  return row.id;
}

export async function sendEmailNotification(options: EmailNotificationOptions): Promise<NotificationDeliveryResult> {
  const config = await getNotificationConfig();
  const provider = config.emailProvider || "resend";
  const recipient = Array.isArray(options.to) ? options.to.join(",") : options.to;

  if (!config.emailEnabled) {
    const result: NotificationDeliveryResult = {
      success: false,
      status: "skipped",
      channel: "email",
      provider,
      configured: false,
      error: "Email notifications are disabled",
    };
    await logNotificationDeliveryFromResult(result, options, recipient);
    return result;
  }

  if (provider !== "resend") {
    const result: NotificationDeliveryResult = {
      success: false,
      status: "skipped",
      channel: "email",
      provider,
      configured: false,
      error: `Email provider ${provider} is not implemented`,
    };
    await logNotificationDeliveryFromResult(result, options, recipient);
    return result;
  }

  const result = await sendViaResend(options, config);
  await logNotificationDeliveryFromResult(result, options, recipient);
  return result;
}

async function sendViaResend(options: EmailNotificationOptions, config: NotificationConfig): Promise<NotificationDeliveryResult> {
  if (!config.resendEnabled || !config.resendApiKey) {
    return {
      success: false,
      status: "skipped",
      channel: "email",
      provider: "resend",
      configured: false,
      error: "Resend is disabled or API key is not configured",
    };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: options.from ?? config.emailFrom,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
      }),
    });

    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      const error = typeof payload?.message === "string"
        ? payload.message
        : `Resend API error: ${res.status}`;
      return {
        success: false,
        status: "failed",
        channel: "email",
        provider: "resend",
        configured: true,
        error,
      };
    }

    return {
      success: true,
      status: "sent",
      channel: "email",
      provider: "resend",
      configured: true,
      providerMessageId: payload?.id,
    };
  } catch (err) {
    return {
      success: false,
      status: "failed",
      channel: "email",
      provider: "resend",
      configured: true,
      error: err instanceof Error ? err.message : "Resend network error",
    };
  }
}

async function logNotificationDeliveryFromResult(
  result: NotificationDeliveryResult,
  options: EmailNotificationOptions,
  recipient: string,
) {
  await logNotificationDelivery({
    userId: options.userId ?? null,
    channel: result.channel,
    provider: result.provider,
    recipient,
    subject: options.subject,
    body: options.text ?? stripHtml(options.html),
    status: result.status,
    providerMessageId: result.providerMessageId ?? null,
    error: result.error ?? null,
    metadata: options.metadata ?? null,
  });
}

export async function logNotificationDelivery(params: {
  notificationId?: string | null;
  userId?: string | null;
  channel: NotificationChannel;
  provider: string;
  recipient: string;
  subject?: string | null;
  body?: string | null;
  status: NotificationStatus;
  providerMessageId?: string | null;
  error?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  await db.insert(notificationDeliveries).values({
    notificationId: params.notificationId ?? null,
    userId: params.userId ?? null,
    channel: params.channel,
    provider: params.provider,
    recipient: params.recipient,
    subject: params.subject ?? null,
    body: params.body ?? null,
    status: params.status,
    providerMessageId: params.providerMessageId ?? null,
    error: params.error ?? null,
    metadata: params.metadata ?? null,
  });
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
