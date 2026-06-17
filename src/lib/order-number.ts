/**
 * Generates sequential order numbers: BW-2024-0001
 * Uses a DB sequence table to guarantee uniqueness under concurrent inserts.
 */

import { db, pool } from "./db";
import { orderSequence } from "./db/schema";
import { eq } from "drizzle-orm";

export async function generateOrderNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = (await import("./config").then((m) => m.getSiteConfig("orders_prefix"))) ?? "AN";

  // Atomic increment via SQL UPDATE ... RETURNING
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Upsert the year row and increment atomically
    const result = await client.query<{ last_id: number }>(
      `INSERT INTO order_sequence (year, last_id) VALUES ($1, 1)
       ON CONFLICT (year) DO UPDATE SET last_id = order_sequence.last_id + 1
       RETURNING last_id`,
      [year]
    );

    await client.query("COMMIT");

    const seq = result.rows[0].last_id;
    const paddedSeq = String(seq).padStart(4, "0");
    return `${prefix}-${year}-${paddedSeq}`;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// Format paise to INR string: 49900 → "₹499.00"
export function formatInr(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
