import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const globalForDb = global as unknown as { dbPool?: Pool };

const DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://placeholder:placeholder@localhost:5432/placeholder";

// Reuse pool across hot reloads in dev
const pool =
  globalForDb.dbPool ??
  new Pool({
    connectionString: DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.dbPool = pool;
}

export const db = drizzle(pool, { schema });
export { pool };
export * from "./schema";
