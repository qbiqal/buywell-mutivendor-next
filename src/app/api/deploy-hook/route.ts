import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-deploy-secret");
  if (!secret || secret !== process.env.DEPLOY_SECRET) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Flush all query and page cache keys (not config:* — those come from DB)
    const patterns = ["query:*", "page:*"];
    let flushed = 0;

    for (const pattern of patterns) {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
        flushed += keys.length;
      }
    }

    return NextResponse.json({
      success: true,
      flushed,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
