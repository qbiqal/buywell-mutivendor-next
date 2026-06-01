import Redis from "ioredis";

declare global {
  // eslint-disable-next-line no-var
  var __redisClient: Redis | undefined;
}

function createRedisClient(): Redis {
  const url = process.env.REDIS_URL;

  // During build (no REDIS_URL), return a no-op stub that gracefully degrades
  if (!url) {
    const stub = {
      get: async () => null,
      set: async () => "OK",
      setex: async () => "OK",
      incr: async () => 1,
      expire: async () => 1,
      ttl: async () => -1,
      del: async () => 0,
      keys: async () => [] as string[],
      scan: async () => ["0", [] as string[]],
      ping: async () => "PONG",
      pipeline: () => ({ exec: async () => [] as unknown[], del: () => {} }),
      on: () => stub,
    } as unknown as Redis;
    return stub;
  }

  const client = new Redis(url, {
    keyPrefix: "an:", // apras-naturals namespace — isolates from ss: (stocksense) and blog:
    maxRetriesPerRequest: 3,
    enableReadyCheck: false,
    lazyConnect: true,
    retryStrategy: (times) => {
      if (times > 5) return null;
      return Math.min(times * 200, 2000);
    },
  });

  client.on("error", (err) => {
    if (process.env.NODE_ENV !== "test") {
      console.error("[redis] Connection error:", err.message);
    }
  });

  return client;
}

// Singleton — reuse in hot-reload dev
export const redis: Redis =
  global.__redisClient ?? (global.__redisClient = createRedisClient());

export default redis;
