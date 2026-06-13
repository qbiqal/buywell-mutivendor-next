import { db } from "./db";
import { sql, eq, inArray } from "drizzle-orm";
import { orderItems, productVariants, products, vendors, orderVendorSplits, vendorCommissions } from "./db/schema";
import { getAllSiteConfig } from "./config";

const DEFAULT_COMMISSION_BPTS = 1000; // 10%

async function getGlobalCommissionBpts(): Promise<number> {
  const cfg = await getAllSiteConfig("commerce");
  const v = parseInt(cfg["vendor_commission_bpts"] ?? "", 10);
  return isNaN(v) ? DEFAULT_COMMISSION_BPTS : v;
}

// Creates order_vendor_splits + vendor_commissions when payment is confirmed.
// Idempotent — skips if splits already exist for this order.
export async function createVendorSplitsForOrder(orderId: string): Promise<void> {
  const existing = await db.select({ id: orderVendorSplits.id })
    .from(orderVendorSplits).where(eq(orderVendorSplits.orderId, orderId)).limit(1);
  if (existing.length > 0) return;

  // Fetch all order items with their product and vendor
  const items = await db.select({
    itemId:    orderItems.id,
    totalInr:  orderItems.totalInr,
    vendorId:  products.vendorId,
  })
  .from(orderItems)
  .innerJoin(productVariants, eq(productVariants.id, orderItems.variantId))
  .innerJoin(products, eq(products.id, productVariants.productId))
  .where(eq(orderItems.orderId, orderId));

  if (items.length === 0) return;

  // Group totals by vendorId (skip platform-owned products with null vendorId)
  const vendorTotals = new Map<number, number>();
  for (const item of items) {
    if (item.vendorId == null) continue;
    vendorTotals.set(item.vendorId, (vendorTotals.get(item.vendorId) ?? 0) + item.totalInr);
  }
  if (vendorTotals.size === 0) return;

  // Fetch commission overrides
  const vendorIds = Array.from(vendorTotals.keys());
  const vendorRows = await db.select({ id: vendors.id, commissionOverride: vendors.commissionOverride })
    .from(vendors).where(inArray(vendors.id, vendorIds));
  const commissionMap = new Map(vendorRows.map((v) => [v.id, v.commissionOverride]));

  const globalBpts = await getGlobalCommissionBpts();

  // Create one split per vendor
  for (const [vendorId, subtotal] of vendorTotals.entries()) {
    await db.insert(orderVendorSplits).values({
      orderId,
      vendorId,
      subtotal,
      status: "confirmed",
    });
  }

  // Create one commission record per order item that belongs to a vendor
  for (const item of items) {
    if (item.vendorId == null) continue;
    const bpts = commissionMap.get(item.vendorId) ?? globalBpts;
    const commissionAmount = Math.round((item.totalInr * bpts) / 10000);
    const vendorPayout = item.totalInr - commissionAmount;

    await db.insert(vendorCommissions).values({
      orderItemId:      item.itemId,
      vendorId:         item.vendorId,
      orderId,
      grossAmount:      item.totalInr,
      commissionRate:   bpts,
      commissionAmount,
      vendorPayout,
      status: "pending",
    });
  }

  // Atomic increment on vendor denormalised stats (one increment per vendor per order)
  for (const [vendorId, subtotal] of vendorTotals.entries()) {
    await db.execute(
      sql`UPDATE vendors SET total_sales = total_sales + ${subtotal}, total_orders = total_orders + 1 WHERE id = ${vendorId}`
    );
  }
}
