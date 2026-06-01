/**
 * Media storage helper.
 * dev: saves to public/uploads/
 * prod: uploads to Cloudflare R2
 */

import { createHash, createHmac } from "crypto";
import { getAllSiteConfig } from "./config";

export async function uploadToR2(key: string, buffer: Buffer, contentType: string): Promise<string> {
  const config = await getR2Config();
  if (!config.accountId || !config.accessKeyId || !config.secretAccessKey || !config.bucketName) {
    throw new Error("R2 credentials are not configured");
  }

  const host = `${config.accountId}.r2.cloudflarestorage.com`;
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");
  const path = `/${config.bucketName}/${encodedKey}`;
  const url = `https://${host}${path}`;
  const signedHeaders = signR2Put({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    host,
    path,
    body: buffer,
    contentType,
  });

  const res = await fetch(url, {
    method: "PUT",
    headers: signedHeaders,
    body: buffer as unknown as BodyInit,
  });

  if (!res.ok) {
    throw new Error(`R2 upload failed: ${res.status} ${res.statusText}`);
  }

  return `${config.publicUrl.replace(/\/$/, "")}/${encodedKey}`;
}

export function getMediaUrl(path: string): string {
  if (path.startsWith("http")) return path;
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return `${base}${path}`;
}

async function getR2Config() {
  const config = await getAllSiteConfig("media");
  const accountId = config.media_r2_account_id || process.env.CLOUDFLARE_R2_ACCOUNT_ID || "";
  const bucketName = config.media_r2_bucket_name || process.env.CLOUDFLARE_R2_BUCKET_NAME || "";
  return {
    accountId,
    accessKeyId: config.media_r2_access_key_id || process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || "",
    secretAccessKey: config.media_r2_secret_access_key || process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || "",
    bucketName,
    publicUrl: config.media_r2_public_url
      || process.env.CLOUDFLARE_R2_PUBLIC_URL
      || (accountId && bucketName ? `https://${bucketName}.${accountId}.r2.cloudflarestorage.com` : ""),
  };
}

function signR2Put(params: {
  accessKeyId: string;
  secretAccessKey: string;
  host: string;
  path: string;
  body: Buffer;
  contentType: string;
}): Record<string, string> {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const region = "auto";
  const service = "s3";
  const payloadHash = createHash("sha256").update(params.body).digest("hex");
  const canonicalHeaders = [
    `content-type:${params.contentType}`,
    `host:${params.host}`,
    `x-amz-content-sha256:${payloadHash}`,
    `x-amz-date:${amzDate}`,
    "",
  ].join("\n");
  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = [
    "PUT",
    params.path,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    createHash("sha256").update(canonicalRequest).digest("hex"),
  ].join("\n");
  const signingKey = getSignatureKey(params.secretAccessKey, dateStamp, region, service);
  const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex");

  return {
    "Content-Type": params.contentType,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
    Authorization: `AWS4-HMAC-SHA256 Credential=${params.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
}

function getSignatureKey(secretKey: string, dateStamp: string, regionName: string, serviceName: string): Buffer {
  const kDate = createHmac("sha256", `AWS4${secretKey}`).update(dateStamp).digest();
  const kRegion = createHmac("sha256", kDate).update(regionName).digest();
  const kService = createHmac("sha256", kRegion).update(serviceName).digest();
  return createHmac("sha256", kService).update("aws4_request").digest();
}
