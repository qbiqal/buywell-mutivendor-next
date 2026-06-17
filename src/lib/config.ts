/**
 * DB-backed site configuration store.
 * Same pattern as StockSense appConfig.
 * Admin panel reads/writes these values. Config-seed.js inserts defaults on deploy.
 */

import { db } from "./db";
import { siteConfig } from "./db/schema";
import { eq } from "drizzle-orm";
import { getCached, setCached, deleteCached, invalidateByPrefix, CACHE_TTL } from "./cache";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const ENCRYPTED_PREFIX = "enc:v1:";

const SECRET_CONFIG_KEYS = new Set([
  "notification_resend_api_key",
  "notification_sms_api_key",
  "notification_sms_auth_token",
  "notification_telegram_bot_token",
  "notification_push_vapid_private_key",
  "whatsapp_access_token",
  "whatsapp_phone_number_id",
  "whatsapp_waha_api_key",
  "media_r2_access_key_id",
  "media_r2_secret_access_key",
  "payment_razorpay_key_id",
  "payment_razorpay_key_secret",
  "payment_bwallet_api_key",
  "payment_stripe_secret_key",
  "payment_stripe_webhook_secret",
  "sentry_dsn",
]);

export async function getSiteConfig(key: string): Promise<string | null> {
  const cacheKey = `config:${key}`;
  const cached = await getCached<string>(cacheKey);
  if (cached !== null) return cached;

  const rows = await db.select().from(siteConfig).where(eq(siteConfig.key, key));
  const value = rows[0]?.value ? decryptConfigValue(key, rows[0].value) : null;

  if (value !== null) {
    await setCached(cacheKey, value, CACHE_TTL.CONFIG);
  }
  return value;
}

export async function setSiteConfig(key: string, value: string, category = "general"): Promise<void> {
  const storedValue = encryptConfigValue(key, value);
  await db
    .insert(siteConfig)
    .values({ key, value: storedValue, category })
    .onConflictDoUpdate({
      target: siteConfig.key,
      set: { value: storedValue, category, updatedAt: new Date() },
    });
  await deleteCached(`config:${key}`);
  await invalidateByPrefix("config:all:");
}

export async function getAllSiteConfig(category?: string): Promise<Record<string, string>> {
  const cacheKey = `config:all:${category ?? "all"}`;
  const cached = await getCached<Record<string, string>>(cacheKey);
  if (cached) return cached;

  let query = db.select().from(siteConfig);
  const rows = category
    ? await db.select().from(siteConfig).where(eq(siteConfig.category, category))
    : await db.select().from(siteConfig);

  const result: Record<string, string> = {};
  for (const row of rows) {
    if (row.value !== null) result[row.key] = decryptConfigValue(row.key, row.value) ?? "";
  }

  await setCached(cacheKey, result, CACHE_TTL.CONFIG);
  return result;
}

export async function getSiteConfigWithEnv(key: string, envName: string, fallback = ""): Promise<string> {
  return (await getSiteConfig(key)) || process.env[envName] || fallback;
}

export function isSecretConfigKey(key: string): boolean {
  return SECRET_CONFIG_KEYS.has(key);
}

// Typed helpers for common config values
export async function getPaymentConfig() {
  const config = await getAllSiteConfig("payment");
  return {
    defaultGateway: config.payment_default_gateway ?? "offline_qr",
    offlineEnabled: (config.payment_offline_qr_enabled ?? config.payment_offline_enabled ?? "true") === "true",
    razorpayEnabled: config.payment_razorpay_enabled === "true",
    razorpayKeyId: config.payment_razorpay_key_id || process.env.RAZORPAY_KEY_ID || "",
    razorpayKeySecret: config.payment_razorpay_key_secret || process.env.RAZORPAY_KEY_SECRET || "",
    stripeEnabled: config.payment_stripe_enabled === "true",
    stripePublishableKey: config.payment_stripe_publishable_key || process.env.STRIPE_PUBLISHABLE_KEY || "",
    stripeSecretKey: config.payment_stripe_secret_key || process.env.STRIPE_SECRET_KEY || "",
    stripeWebhookSecret: config.payment_stripe_webhook_secret || process.env.STRIPE_WEBHOOK_SECRET || "",
    qrUrl: config.payment_qr_url ?? "",
    upiId: config.payment_upi_id ?? "",
    companyName: config.payment_company_name ?? "BuyWell Marketplace",
  };
}

export async function getShippingConfig() {
  const config = await getAllSiteConfig("shipping");
  return {
    freeAbovePaise: parseInt(config.shipping_free_above ?? "99900"),
    flatRatePaise: parseInt(config.shipping_flat_rate ?? "6000"),
    freeEnabled: config.shipping_free_enabled !== "false",
  };
}

export async function getLocalizationConfig() {
  const config = await getAllSiteConfig("localization");
  return {
    defaultLocale: config.locale_default ?? "en",
    enabledLocales: (config.locales_enabled ?? "en")
      .split(",")
      .map((locale) => locale.trim())
      .filter(Boolean),
  };
}

export async function getCurrencyConfig() {
  const config = await getAllSiteConfig("localization");
  const defaultCurrency = config.currency_default ?? "INR";
  const enabledCurrencies = (config.currencies_enabled ?? defaultCurrency)
    .split(",")
    .map((currency) => currency.trim().toUpperCase())
    .filter(Boolean);

  let rates: Record<string, number> = { INR: 1 };
  try {
    rates = JSON.parse(config.currency_rates_json ?? "{\"INR\":1}") as Record<string, number>;
  } catch {}

  return { defaultCurrency, enabledCurrencies, rates };
}

function encryptConfigValue(key: string, value: string): string {
  if (!value || !isSecretConfigKey(key) || value.startsWith(ENCRYPTED_PREFIX)) return value;
  const secret = getEncryptionKey();
  if (!secret) return value;

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", secret, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${ENCRYPTED_PREFIX}${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

function decryptConfigValue(key: string, value: string): string | null {
  if (!isSecretConfigKey(key) || !value.startsWith(ENCRYPTED_PREFIX)) return value;
  const secret = getEncryptionKey();
  if (!secret) return null;

  try {
    const [, ivRaw, tagRaw, encryptedRaw] = value.match(/^enc:v1:([^:]+):([^:]+):(.+)$/) ?? [];
    if (!ivRaw || !tagRaw || !encryptedRaw) return null;
    const decipher = createDecipheriv("aes-256-gcm", secret, Buffer.from(ivRaw, "base64"));
    decipher.setAuthTag(Buffer.from(tagRaw, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(encryptedRaw, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}

function getEncryptionKey(): Buffer | null {
  const source = process.env.CONFIG_ENCRYPTION_KEY
    || process.env.APP_CONFIG_ENCRYPTION_KEY
    || process.env.JWT_SECRET
    || "";
  if (!source) return null;
  return createHash("sha256").update(source).digest();
}
