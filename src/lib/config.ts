/**
 * DB-backed site configuration store.
 * Same pattern as StockSense appConfig.
 * Admin panel reads/writes these values. Config-seed.js inserts defaults on deploy.
 */

import { db } from "./db";
import { siteConfig } from "./db/schema";
import { eq } from "drizzle-orm";
import { getCached, setCached, deleteCached, CACHE_TTL } from "./cache";

export async function getSiteConfig(key: string): Promise<string | null> {
  const cacheKey = `config:${key}`;
  const cached = await getCached<string>(cacheKey);
  if (cached !== null) return cached;

  const rows = await db.select().from(siteConfig).where(eq(siteConfig.key, key));
  const value = rows[0]?.value ?? null;

  if (value !== null) {
    await setCached(cacheKey, value, CACHE_TTL.CONFIG);
  }
  return value;
}

export async function setSiteConfig(key: string, value: string, category = "general"): Promise<void> {
  await db
    .insert(siteConfig)
    .values({ key, value, category })
    .onConflictDoUpdate({
      target: siteConfig.key,
      set: { value, updatedAt: new Date() },
    });
  await deleteCached(`config:${key}`);
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
    if (row.value !== null) result[row.key] = row.value;
  }

  await setCached(cacheKey, result, CACHE_TTL.CONFIG);
  return result;
}

// Typed helpers for common config values
export async function getPaymentConfig() {
  const config = await getAllSiteConfig("payment");
  return {
    defaultGateway: config.payment_default_gateway ?? "offline_qr",
    offlineEnabled: config.payment_offline_enabled === "true",
    razorpayEnabled: config.payment_razorpay_enabled === "true",
    stripeEnabled: config.payment_stripe_enabled === "true",
    qrUrl: config.payment_qr_url ?? "",
    upiId: config.payment_upi_id ?? "",
    companyName: config.payment_company_name ?? "APRAS Naturals",
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
