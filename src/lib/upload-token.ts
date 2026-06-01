import { createHmac, timingSafeEqual } from "crypto";

const DEFAULT_TTL_SECONDS = 60 * 60 * 24;

export function createPaymentProofUploadToken(orderId: string, ttlSeconds = DEFAULT_TTL_SECONDS): string {
  const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${orderId}.${expires}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyPaymentProofUploadToken(token: string, orderId: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [tokenOrderId, expiresRaw, signature] = parts;
  if (tokenOrderId !== orderId) return false;
  const expires = parseInt(expiresRaw, 10);
  if (!Number.isFinite(expires) || expires < Math.floor(Date.now() / 1000)) return false;
  const expected = sign(`${tokenOrderId}.${expiresRaw}`);
  return safeEqual(signature, expected);
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

function getSecret(): string {
  return process.env.UPLOAD_TOKEN_SECRET || process.env.JWT_SECRET || "dev-upload-token-secret";
}

function safeEqual(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  return aBuffer.length === bBuffer.length && timingSafeEqual(aBuffer, bBuffer);
}
