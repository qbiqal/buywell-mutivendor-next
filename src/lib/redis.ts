import Redis from "ioredis";

declare global {
  // eslint-disable-next-line no-var
  var __redisClient: Redis | undefined;
}

function createRedisClient(): Redis {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error("REDIS_URL environment variable is not set");
  }

  const client = new Redis(url, {
    keyPrefix: "an:", // apras-naturals namespace — isolates from ss: (stocksense) and blog:
    maxRetriesPerRequest: 3,
    enableReadyCheck: false,
    lazyConnect: true,
    retryStrategy: (times) => {
      if (times > 5) return null; // stop retrying
      return Math.min(times * 200, 2000);
    },
  });

  client.on("error", (err) => {
    // Log but don't crash — app continues without cache on Redis failure
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
