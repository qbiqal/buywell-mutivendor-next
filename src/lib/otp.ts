import bcrypt from "bcryptjs";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { db } from "./db";
import { otpCodes } from "./db/schema";
import { getAllSiteConfig } from "./config";
import { sendEmailNotification } from "./notifications";

export type OtpPurpose = "email_verification" | "password_reset" | "login";

export interface OtpConfig {
  emailEnabled: boolean;
  emailVerificationEnabled: boolean;
  passwordResetEnabled: boolean;
  emailVerificationTtlMinutes: number;
  passwordResetTtlMinutes: number;
  maxAttempts: number;
}

export interface OtpCreateResult {
  id: string;
  code: string;
  expiresAt: Date;
}

export interface OtpVerifyResult {
  success: boolean;
  userId?: string | null;
  error?: string;
}

export async function getOtpConfig(): Promise<OtpConfig> {
  const config = await getAllSiteConfig("otp");
  return {
    emailEnabled: config.otp_email_enabled !== "false",
    emailVerificationEnabled: config.otp_email_verification_enabled !== "false",
    passwordResetEnabled: config.otp_password_reset_enabled !== "false",
    emailVerificationTtlMinutes: parsePositiveInt(config.otp_email_verification_ttl_minutes, 60),
    passwordResetTtlMinutes: parsePositiveInt(config.otp_password_reset_ttl_minutes, 30),
    maxAttempts: parsePositiveInt(config.otp_max_attempts, 5),
  };
}

export async function createOtp(params: {
  purpose: OtpPurpose;
  target: string;
  userId?: string | null;
  ttlMinutes: number;
  metadata?: Record<string, unknown>;
}): Promise<OtpCreateResult> {
  const normalizedTarget = normalizeTarget(params.target);
  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + params.ttlMinutes * 60 * 1000);

  await db.update(otpCodes)
    .set({ consumedAt: new Date() })
    .where(and(
      eq(otpCodes.purpose, params.purpose),
      eq(otpCodes.target, normalizedTarget),
      isNull(otpCodes.consumedAt),
    ));

  const [row] = await db.insert(otpCodes).values({
    userId: params.userId ?? null,
    purpose: params.purpose,
    channel: "email",
    target: normalizedTarget,
    codeHash: await bcrypt.hash(code, 12),
    expiresAt,
    metadata: params.metadata ?? null,
  }).returning({ id: otpCodes.id });

  return { id: row.id, code, expiresAt };
}

export async function verifyOtpCode(params: {
  purpose: OtpPurpose;
  target: string;
  code: string;
}): Promise<OtpVerifyResult> {
  const config = await getOtpConfig();
  const normalizedTarget = normalizeTarget(params.target);
  const rows = await db.select()
    .from(otpCodes)
    .where(and(
      eq(otpCodes.purpose, params.purpose),
      eq(otpCodes.target, normalizedTarget),
      isNull(otpCodes.consumedAt),
      gt(otpCodes.expiresAt, new Date()),
    ))
    .orderBy(desc(otpCodes.createdAt))
    .limit(1);

  const otp = rows[0];
  if (!otp) return { success: false, error: "Invalid or expired code" };
  if (otp.attempts >= config.maxAttempts) {
    await db.update(otpCodes).set({ consumedAt: new Date() }).where(eq(otpCodes.id, otp.id));
    return { success: false, error: "Too many attempts. Request a new code." };
  }

  const valid = await bcrypt.compare(params.code.trim(), otp.codeHash);
  if (!valid) {
    await db.update(otpCodes).set({ attempts: otp.attempts + 1 }).where(eq(otpCodes.id, otp.id));
    return { success: false, error: "Invalid or expired code" };
  }

  await db.update(otpCodes).set({ consumedAt: new Date() }).where(eq(otpCodes.id, otp.id));
  return { success: true, userId: otp.userId };
}

export async function sendEmailVerificationOtp(params: {
  userId: string;
  email: string;
  firstName: string;
}): Promise<{ sent: boolean; deliveryStatus: string; debugCode?: string }> {
  const config = await getOtpConfig();
  if (!config.emailEnabled || !config.emailVerificationEnabled) {
    return { sent: false, deliveryStatus: "skipped" };
  }

  const otp = await createOtp({
    purpose: "email_verification",
    target: params.email,
    userId: params.userId,
    ttlMinutes: config.emailVerificationTtlMinutes,
  });

  const result = await sendEmailNotification({
    to: params.email,
    userId: params.userId,
    subject: "Verify your BuyWell Marketplace account",
    html: renderOtpEmail({
      title: "Verify your email",
      greeting: `Hi ${escapeHtml(params.firstName)},`,
      intro: "Use this code to verify your BuyWell Marketplace account.",
      code: otp.code,
      expiresAt: otp.expiresAt,
    }),
    text: `Your BuyWell Marketplace verification code is ${otp.code}. It expires at ${otp.expiresAt.toISOString()}.`,
    metadata: { purpose: "email_verification", otpId: otp.id },
  });

  return {
    sent: result.success,
    deliveryStatus: result.status,
    debugCode: developmentDebugCode(otp.code),
  };
}

export async function sendPasswordResetOtp(params: {
  userId: string;
  email: string;
  firstName: string;
}): Promise<{ sent: boolean; deliveryStatus: string; debugCode?: string }> {
  const config = await getOtpConfig();
  if (!config.emailEnabled || !config.passwordResetEnabled) {
    return { sent: false, deliveryStatus: "skipped" };
  }

  const otp = await createOtp({
    purpose: "password_reset",
    target: params.email,
    userId: params.userId,
    ttlMinutes: config.passwordResetTtlMinutes,
  });

  const result = await sendEmailNotification({
    to: params.email,
    userId: params.userId,
    subject: "Reset your BuyWell Marketplace password",
    html: renderOtpEmail({
      title: "Reset your password",
      greeting: `Hi ${escapeHtml(params.firstName)},`,
      intro: "Use this code to reset your BuyWell Marketplace password.",
      code: otp.code,
      expiresAt: otp.expiresAt,
    }),
    text: `Your BuyWell Marketplace password reset code is ${otp.code}. It expires at ${otp.expiresAt.toISOString()}.`,
    metadata: { purpose: "password_reset", otpId: otp.id },
  });

  return {
    sent: result.success,
    deliveryStatus: result.status,
    debugCode: developmentDebugCode(otp.code),
  };
}

export function normalizeTarget(target: string): string {
  return target.trim().toLowerCase();
}

function generateOtpCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function developmentDebugCode(code: string): string | undefined {
  return process.env.NODE_ENV === "production" ? undefined : code;
}

function renderOtpEmail(params: {
  title: string;
  greeting: string;
  intro: string;
  code: string;
  expiresAt: Date;
}) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #18110a;">
      <div style="padding: 24px; background: #1B4332; color: #fff; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 22px;">BuyWell Marketplace</h1>
      </div>
      <div style="padding: 28px; border: 1px solid #e7e0d6; border-top: 0; border-radius: 0 0 8px 8px;">
        <h2 style="margin-top: 0;">${escapeHtml(params.title)}</h2>
        <p>${params.greeting}</p>
        <p>${escapeHtml(params.intro)}</p>
        <div style="font-size: 32px; letter-spacing: 8px; font-weight: 700; background: #FEF3C7; padding: 16px; text-align: center; border-radius: 8px; margin: 20px 0;">
          ${params.code}
        </div>
        <p style="font-size: 13px; color: #6b6259;">This code expires at ${params.expiresAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST.</p>
        <p style="font-size: 13px; color: #6b6259;">If you did not request this, you can ignore this email.</p>
      </div>
    </div>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
