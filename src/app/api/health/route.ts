import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { redis } from "@/lib/redis";

export async function GET() {
  const status: Record<string, string> = {
    app: "ok",
    timestamp: new Date().toISOString(),
  };

  // DB ping
  try {
    await pool.query("SELECT 1");
    status.db = "ok";
  } catch {
    status.db = "error";
  }

  // Redis ping
  try {
    await redis.ping();
    status.redis = "ok";
  } catch {
    status.redis = "error";
  }

  const allOk = status.db === "ok" && status.redis === "ok";

  return NextResponse.json(
    { success: allOk, status },
    { status: allOk ? 200 : 503 }
  );
}
