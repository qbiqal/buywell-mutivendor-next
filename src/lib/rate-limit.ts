import { redis } from "./redis";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetSeconds: number;
}

export async function rateLimit(params: {
  key: string;
  limit: number;
  windowSeconds: number;
}): Promise<RateLimitResult> {
  const safeLimit = Math.max(1, params.limit);
  const safeWindow = Math.max(1, params.windowSeconds);

  try {
    const count = await redis.incr(params.key);
    if (count === 1) {
      await redis.expire(params.key, safeWindow);
    }
    const ttl = await redis.ttl(params.key);
    return {
      allowed: count <= safeLimit,
      remaining: Math.max(0, safeLimit - count),
      resetSeconds: ttl > 0 ? ttl : safeWindow,
    };
  } catch {
    return { allowed: true, remaining: safeLimit, resetSeconds: safeWindow };
  }
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip") ?? "unknown";
}
