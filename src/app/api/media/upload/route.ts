import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { media } from "@/lib/db/schema";
import { createAdminGuard, getAuthPayload } from "@/lib/middleware";
import { handleApiError, ValidationError } from "@/lib/errors";
import { getAllSiteConfig } from "@/lib/config";
import path from "path";
import fs from "fs/promises";

const MAX_SIZE_BYTES = 100 * 1024 * 1024; // 100MB for homepage/product videos
const ALLOWED_TYPES  = ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm"];

export async function POST(req: NextRequest) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;

    const payload = await getAuthPayload(req);

    const formData = await req.formData();
    const file   = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) ?? "general";
    const widthRaw = formData.get("width");
    const heightRaw = formData.get("height");
    const width = widthRaw ? parseInt(String(widthRaw), 10) : null;
    const height = heightRaw ? parseInt(String(heightRaw), 10) : null;

    if (!file)                           throw new ValidationError("No file provided");
    if (!ALLOWED_TYPES.includes(file.type)) throw new ValidationError(`File type not allowed: ${file.type}`);
    if (file.size > MAX_SIZE_BYTES)      throw new ValidationError("File too large — max 10MB");

    const ext      = file.name.split(".").pop() ?? "jpg";
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const bytes    = await file.arrayBuffer();
    const buffer   = Buffer.from(bytes);

    let url: string;
    const mediaConfig = await getAllSiteConfig("media");
    // Only use R2 when all four credentials are present — partial config falls back to local.
    const r2Configured = !!(
      (mediaConfig.media_r2_account_id    || process.env.CLOUDFLARE_R2_ACCOUNT_ID) &&
      (mediaConfig.media_r2_access_key_id || process.env.CLOUDFLARE_R2_ACCESS_KEY_ID) &&
      (mediaConfig.media_r2_secret_access_key || process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY) &&
      (mediaConfig.media_r2_bucket_name   || process.env.CLOUDFLARE_R2_BUCKET_NAME)
    );
    const storage: "local" | "r2" = (mediaConfig.media_storage === "r2" && r2Configured) ? "r2" : "local";

    if (storage === "r2") {
      const { uploadToR2 } = await import("@/lib/media");
      url = await uploadToR2(`${folder}/${filename}`, buffer, file.type);
    } else {
      // Save locally
      const dir = path.join(process.cwd(), "public", "uploads", folder);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, filename), buffer);
      url = `/uploads/${folder}/${filename}`;
    }

    const [inserted] = await db.insert(media).values({
      filename,
      originalName: file.name,
      url,
      mimeType:     file.type,
      sizeBytes:    file.size,
      width:        Number.isFinite(width) ? width : null,
      height:       Number.isFinite(height) ? height : null,
      folder,
      storage,
      uploadedBy:   payload?.sub ?? null,
    }).returning();

    return NextResponse.json({ success: true, data: inserted }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
