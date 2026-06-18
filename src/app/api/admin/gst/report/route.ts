import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, orderItems, products, productVariants, vendors, taxRates } from "@/lib/db/schema";
import { eq, and, gte, lte, sql, inArray } from "drizzle-orm";
import { createAdminGuard } from "@/lib/middleware";
import { handleApiError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;

    const { searchParams } = req.nextUrl;
    const from      = searchParams.get("from");
    const to        = searchParams.get("to");
    const vendorId  = searchParams.get("vendorId");

    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate   = to   ? new Date(to + "T23:59:59Z") : new Date();

    const conditions = [
      gte(orders.createdAt, fromDate),
      lte(orders.createdAt, toDate),
      eq(orders.paymentStatus, "verified"),
    ];

    // Fetch orders with their items and product tax info
    const rows = await db
      .select({
        orderNumber:  orders.orderNumber,
        orderId:      orders.id,
        createdAt:    orders.createdAt,
        buyerName:    sql<string>`coalesce(${orders.guestName}, 'Customer')`,
        totalInr:     orders.totalInr,
        itemTotal:    orderItems.totalInr,
        hsnCode:      products.hsnCode,
        taxRateId:    products.taxRateId,
        taxName:      taxRates.name,
        totalRate:    taxRates.totalRate,
        cgstRate:     taxRates.cgstRate,
        sgstRate:     taxRates.sgstRate,
        igstRate:     taxRates.igstRate,
        vendorId:     products.vendorId,
        storeName:    vendors.storeName,
      })
      .from(orders)
      .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
      .innerJoin(productVariants, eq(productVariants.id, orderItems.variantId))
      .innerJoin(products, eq(products.id, productVariants.productId))
      .leftJoin(taxRates, eq(taxRates.id, products.taxRateId))
      .leftJoin(vendors, eq(vendors.id, products.vendorId))
      .where(and(
        ...conditions,
        vendorId ? eq(products.vendorId, parseInt(vendorId, 10)) : undefined,
      ));

    // Group by order + taxRate
    const orderMap = new Map<string, {
      orderNumber: string; orderId: string; createdAt: Date; buyerName: string;
      totalInr: number; taxableValue: number; cgst: number; sgst: number; igst: number;
      taxRateName: string; hsnCode: string | null; storeName: string | null;
    }>();

    const byTaxRate = new Map<number, { taxRateName: string; totalRate: number; taxableValue: number; cgst: number; sgst: number; igst: number; orderIds: Set<string> }>();

    for (const row of rows) {
      if (!row.taxRateId || !row.totalRate) continue; // skip exempt items

      const rate    = row.totalRate;
      const cgstR   = row.cgstRate ?? 0;
      const sgstR   = row.sgstRate ?? 0;
      const igstR   = row.igstRate ?? 0;
      const itemVal = row.itemTotal;

      // Back-calculate taxable value: totalInclusive = taxable * (1 + rate/10000)
      const taxable = Math.round(itemVal * 10000 / (10000 + rate));
      const cgst    = Math.round(taxable * cgstR / 10000);
      const sgst    = Math.round(taxable * sgstR / 10000);
      const igst    = Math.round(taxable * igstR / 10000);

      // Order-level aggregation (use first tax rate encountered for summary)
      const key = row.orderId;
      if (!orderMap.has(key)) {
        orderMap.set(key, {
          orderNumber: row.orderNumber, orderId: row.orderId,
          createdAt: row.createdAt as unknown as Date, buyerName: row.buyerName,
          totalInr: row.totalInr, taxableValue: 0, cgst: 0, sgst: 0, igst: 0,
          taxRateName: row.taxName ?? "—", hsnCode: row.hsnCode ?? null,
          storeName: row.storeName ?? null,
        });
      }
      const ord = orderMap.get(key)!;
      ord.taxableValue += taxable;
      ord.cgst += cgst;
      ord.sgst += sgst;
      ord.igst += igst;

      // By-tax-rate breakdown
      if (!byTaxRate.has(row.taxRateId)) {
        byTaxRate.set(row.taxRateId, { taxRateName: row.taxName ?? "—", totalRate: rate, taxableValue: 0, cgst: 0, sgst: 0, igst: 0, orderIds: new Set() });
      }
      const tr = byTaxRate.get(row.taxRateId)!;
      tr.taxableValue += taxable;
      tr.cgst += cgst;
      tr.sgst += sgst;
      tr.igst += igst;
      tr.orderIds.add(row.orderId);
    }

    const orderList = Array.from(orderMap.values()).map(o => ({
      ...o,
      createdAt: (o.createdAt as Date).toISOString(),
      totalTax: o.cgst + o.sgst + o.igst,
    })).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const totalTaxableValue = orderList.reduce((s, o) => s + o.taxableValue, 0);
    const totalCgst  = orderList.reduce((s, o) => s + o.cgst, 0);
    const totalSgst  = orderList.reduce((s, o) => s + o.sgst, 0);
    const totalIgst  = orderList.reduce((s, o) => s + o.igst, 0);

    return NextResponse.json({
      success: true,
      summary: {
        totalOrders: orderMap.size,
        taxableValueInr: totalTaxableValue,
        totalCgst,
        totalSgst,
        totalIgst,
        totalTax: totalCgst + totalSgst + totalIgst,
      },
      byTaxRate: Array.from(byTaxRate.values()).map(tr => ({
        taxRateName: tr.taxRateName,
        totalRate: tr.totalRate,
        taxableValue: tr.taxableValue,
        cgst: tr.cgst,
        sgst: tr.sgst,
        igst: tr.igst,
        totalTax: tr.cgst + tr.sgst + tr.igst,
        orderCount: tr.orderIds.size,
      })).sort((a, b) => b.taxableValue - a.taxableValue),
      orders: orderList,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
