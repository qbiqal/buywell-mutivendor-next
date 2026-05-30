/**
 * Media storage helper.
 * dev: saves to public/uploads/
 * prod: uploads to Cloudflare R2
 */

export async function uploadToR2(key: string, buffer: Buffer, contentType: string): Promise<string> {
  const accountId  = process.env.CLOUDFLARE_R2_ACCOUNT_ID!;
  const accessKey  = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!;
  const secretKey  = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!;
  const bucket     = process.env.CLOUDFLARE_R2_BUCKET_NAME!;
  const publicUrl  = process.env.CLOUDFLARE_R2_PUBLIC_URL ?? `https://${bucket}.${accountId}.r2.cloudflarestorage.com`;

  // Use fetch with AWS S3-compatible API (R2 is S3-compatible)
  const url = `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${key}`;

  // Generate AWS Signature v4 — simplified via @aws-sdk if available
  // For now: basic PUT (assumes public-read bucket or signed URL flow)
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
      "x-amz-acl":    "public-read",
    },
    body: buffer as unknown as BodyInit,
  });

  if (!res.ok) {
    throw new Error(`R2 upload failed: ${res.status} ${res.statusText}`);
  }

  return `${publicUrl}/${key}`;
}

export function getMediaUrl(path: string): string {
  if (path.startsWith("http")) return path;
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return `${base}${path}`;
}
