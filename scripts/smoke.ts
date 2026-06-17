import fs from "fs";
import path from "path";
import { sql } from "drizzle-orm";

function loadLocalEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    process.env[key] ??= value;
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

let closePool: (() => Promise<unknown>) | undefined;
let closeRedis: (() => void) | undefined;

async function main() {
  loadLocalEnv();
  const [{ db, pool, siteConfig }, { getCurrencyConfig, getLocalizationConfig }, { getModuleState, getPaymentModuleState }, { getNotificationConfig }, { getOtpConfig }, { redis }] = await Promise.all([
    import("../src/lib/db"),
    import("../src/lib/config"),
    import("../src/lib/modules"),
    import("../src/lib/notifications"),
    import("../src/lib/otp"),
    import("../src/lib/redis"),
  ]);
  closePool = () => pool.end();
  closeRedis = () => redis.disconnect();

  const [modules, payments, localization, currency, notification, otp, configCount] = await Promise.all([
    getModuleState(),
    getPaymentModuleState(),
    getLocalizationConfig(),
    getCurrencyConfig(),
    getNotificationConfig(),
    getOtpConfig(),
    db.select({ count: sql<number>`count(*)` }).from(siteConfig),
  ]);

  assert(modules.core === true, "Core module must always be enabled");
  assert(modules.cms === true, "CMS module should be enabled by seed");
  assert(modules.blog === true, "Blog module should be enabled by seed");
  assert(modules.ecommerce === true, "E-Commerce module should be enabled by seed");
  // payment_offline_qr_enabled may be disabled in production; at minimum the payment module registry must be intact
  assert(typeof payments.offline_qr === "boolean", "Payment module state must be queryable");
  assert(localization.defaultLocale === "en", "Default locale should be en");
  assert(localization.enabledLocales.includes("en"), "Enabled locales should include en");
  assert(currency.defaultCurrency === "INR", "Default currency should be INR");
  assert(currency.enabledCurrencies.includes("INR"), "Enabled currencies should include INR");
  assert(notification.emailProvider === "resend", "Default email provider should be Resend");
  assert(notification.inAppEnabled === true, "In-app notifications should be enabled by seed");
  assert(otp.emailVerificationEnabled === true, "Email verification OTP should be enabled by seed");
  assert(otp.passwordResetEnabled === true, "Password reset OTP should be enabled by seed");
  assert(Number(configCount[0]?.count ?? 0) >= 90, "Expected seeded config rows");

  console.log("[smoke] OK: modules, payment module, localization, currency, notification, OTP, and config seed verified.");
}

main()
  .catch((err) => {
    console.error("[smoke] FAILED:", err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool?.().catch(() => {});
    closeRedis?.();
  });
