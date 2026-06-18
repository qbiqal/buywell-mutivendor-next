import { NextRequest, NextResponse } from "next/server";
import { and, eq, gte, lte, sql, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { orderItems, orders, trafficEvents, users, orderVendorSplits, vendors, vendorCommissions } from "@/lib/db/schema";
import { createAdminGuard } from "@/lib/middleware";
import { handleApiError } from "@/lib/errors";
import { requireModuleApi } from "@/lib/modules";

export async function GET(req: NextRequest) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;
    const moduleResult = await requireModuleApi("ecommerce");
    if (moduleResult) return moduleResult;

    const { searchParams } = req.nextUrl;
    const days       = clamp(parseInt(searchParams.get("days") ?? "30"), 1, 365);
    const format     = searchParams.get("format");
    const vendorId   = searchParams.get("vendorId") ? parseInt(searchParams.get("vendorId")!, 10) : null;
    const productName= searchParams.get("productName") ?? null;
    const dateFrom   = searchParams.get("dateFrom") ?? null;
    const dateTo     = searchParams.get("dateTo") ?? null;

    // Date window: dateFrom/dateTo override days preset
    const since: Date = dateFrom
      ? new Date(`${dateFrom}T00:00:00.000Z`)
      : new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const until: Date | null = dateTo ? new Date(`${dateTo}T23:59:59.999Z`) : null;

    // If vendorId filter: find order IDs that include that vendor
    let filteredOrderIds: string[] | null = null;
    if (vendorId !== null && !isNaN(vendorId)) {
      const vendorSplits = await db
        .select({ orderId: orderVendorSplits.orderId })
        .from(orderVendorSplits)
        .where(eq(orderVendorSplits.vendorId, vendorId));
      filteredOrderIds = vendorSplits.map((s) => s.orderId);
      if (filteredOrderIds.length === 0) filteredOrderIds = ["__no_match__"];
    }

    // If productName filter: find order IDs that include that product
    if (productName) {
      const productItems = await db
        .select({ orderId: orderItems.orderId })
        .from(orderItems)
        .where(sql`${orderItems.productSnapshot}->>'productName' ilike ${'%' + productName + '%'}`);
      const productOrderIds = productItems.map((i) => i.orderId);
      if (filteredOrderIds !== null) {
        // Intersect
        const set = new Set(productOrderIds);
        filteredOrderIds = filteredOrderIds.filter((id) => set.has(id));
      } else {
        filteredOrderIds = productOrderIds.length > 0 ? productOrderIds : ["__no_match__"];
      }
    }

    // Build base conditions for orders
    const baseConditions = [gte(orders.createdAt, since)];
    if (until) baseConditions.push(lte(orders.createdAt, until));
    if (filteredOrderIds) baseConditions.push(inArray(orders.id, filteredOrderIds));
    const orderWhere = and(...baseConditions);

    const effectiveDays = dateFrom ? Math.max(1, Math.ceil((until ?? new Date()).getTime() - since.getTime()) / (24 * 60 * 60 * 1000)) : days;

    const [summaryRows, revenueRows, statusRows, paymentRows, topProducts, customerRows, trafficSummaryRows, topPages, referrers, sources, vendorBreakdownRows] = await Promise.all([
      db
        .select({
          totalOrders: sql<number>`count(*)`,
          verifiedRevenueInr: sql<number>`coalesce(sum(case when ${orders.paymentStatus} = 'verified' then ${orders.totalInr} else 0 end), 0)`,
          pendingVerification: sql<number>`count(*) filter (where ${orders.paymentStatus} = 'uploaded')`,
          sampleRequests: sql<number>`count(*) filter (where ${orders.isSampleRequest} = true)`,
          averageOrderInr: sql<number>`coalesce(avg(${orders.totalInr}), 0)`,
        })
        .from(orders)
        .where(orderWhere),
      db
        .select({
          date: sql<string>`to_char(date_trunc('day', ${orders.createdAt}), 'YYYY-MM-DD')`,
          orderCount: sql<number>`count(*)`,
          revenueInr: sql<number>`coalesce(sum(case when ${orders.paymentStatus} = 'verified' then ${orders.totalInr} else 0 end), 0)`,
        })
        .from(orders)
        .where(orderWhere)
        .groupBy(sql`date_trunc('day', ${orders.createdAt})`)
        .orderBy(sql`date_trunc('day', ${orders.createdAt})`),
      db
        .select({ status: orders.status, count: sql<number>`count(*)` })
        .from(orders).where(orderWhere)
        .groupBy(orders.status).orderBy(sql`count(*) desc`),
      db
        .select({ status: orders.paymentStatus, count: sql<number>`count(*)` })
        .from(orders).where(orderWhere)
        .groupBy(orders.paymentStatus).orderBy(sql`count(*) desc`),
      db
        .select({
          productName: sql<string>`coalesce(${orderItems.productSnapshot}->>'productName', ${orderItems.productSnapshot}->>'name', 'Unknown')`,
          quantity: sql<number>`sum(${orderItems.quantity})`,
          revenueInr: sql<number>`sum(${orderItems.totalInr})`,
        })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .where(and(orderWhere, sql`${orders.status} != 'cancelled'`))
        .groupBy(sql`coalesce(${orderItems.productSnapshot}->>'productName', ${orderItems.productSnapshot}->>'name', 'Unknown')`)
        .orderBy(sql`sum(${orderItems.totalInr}) desc`)
        .limit(10),
      db
        .select({
          date: sql<string>`to_char(date_trunc('day', ${users.createdAt}), 'YYYY-MM-DD')`,
          count: sql<number>`count(*)`,
        })
        .from(users)
        .where(and(eq(users.role, "customer"), gte(users.createdAt, since), ...(until ? [lte(users.createdAt, until)] : [])))
        .groupBy(sql`date_trunc('day', ${users.createdAt})`)
        .orderBy(sql`date_trunc('day', ${users.createdAt})`),
      db
        .select({
          pageViews: sql<number>`count(*)`,
          uniqueVisitors: sql<number>`count(distinct ${trafficEvents.visitorId})`,
          sessions: sql<number>`count(distinct ${trafficEvents.sessionId})`,
        })
        .from(trafficEvents)
        .where(and(gte(trafficEvents.createdAt, since), ...(until ? [lte(trafficEvents.createdAt, until)] : []))),
      db
        .select({
          path: trafficEvents.path,
          views: sql<number>`count(*)`,
          visitors: sql<number>`count(distinct ${trafficEvents.visitorId})`,
        })
        .from(trafficEvents)
        .where(and(gte(trafficEvents.createdAt, since), ...(until ? [lte(trafficEvents.createdAt, until)] : [])))
        .groupBy(trafficEvents.path)
        .orderBy(sql`count(*) desc`)
        .limit(10),
      db
        .select({
          referrer: sql<string>`coalesce(nullif(${trafficEvents.referrer}, ''), 'Direct')`,
          views: sql<number>`count(*)`,
        })
        .from(trafficEvents)
        .where(and(gte(trafficEvents.createdAt, since), ...(until ? [lte(trafficEvents.createdAt, until)] : [])))
        .groupBy(sql`coalesce(nullif(${trafficEvents.referrer}, ''), 'Direct')`)
        .orderBy(sql`count(*) desc`)
        .limit(8),
      db
        .select({
          source: sql<string>`coalesce(nullif(${trafficEvents.source}, ''), 'direct')`,
          views: sql<number>`count(*)`,
        })
        .from(trafficEvents)
        .where(and(gte(trafficEvents.createdAt, since), ...(until ? [lte(trafficEvents.createdAt, until)] : [])))
        .groupBy(sql`coalesce(nullif(${trafficEvents.source}, ''), 'direct')`)
        .orderBy(sql`count(*) desc`)
        .limit(8),
      // Vendor breakdown: join order_vendor_splits + vendors + vendor_commissions
      db
        .select({
          vendorId: vendors.id,
          storeName: vendors.storeName,
          orderCount: sql<number>`count(distinct ${orderVendorSplits.orderId})`,
          revenueInr: sql<number>`coalesce(sum(${orderVendorSplits.subtotal}), 0)`,
          commissionAmount: sql<number>`coalesce(sum(${vendorCommissions.commissionAmount}), 0)`,
        })
        .from(orderVendorSplits)
        .innerJoin(vendors, eq(vendors.id, orderVendorSplits.vendorId))
        .innerJoin(orders, eq(orders.id, orderVendorSplits.orderId))
        .leftJoin(vendorCommissions, and(
          eq(vendorCommissions.orderId, orderVendorSplits.orderId),
          eq(vendorCommissions.vendorId, orderVendorSplits.vendorId),
        ))
        .where(and(gte(orders.createdAt, since), ...(until ? [lte(orders.createdAt, until)] : [])))
        .groupBy(vendors.id, vendors.storeName)
        .orderBy(sql`coalesce(sum(${orderVendorSplits.subtotal}), 0) desc`),
    ]);

    const summary = summaryRows[0] ?? {
      totalOrders: 0, verifiedRevenueInr: 0, pendingVerification: 0,
      sampleRequests: 0, averageOrderInr: 0,
    };
    const trafficSummary = trafficSummaryRows[0] ?? { pageViews: 0, uniqueVisitors: 0, sessions: 0 };

    const data = {
      range: {
        days: Math.round(effectiveDays),
        since: since.toISOString(),
        until: until?.toISOString() ?? null,
        dateFrom,
        dateTo,
        vendorId,
        productName,
      },
      summary: {
        totalOrders: Number(summary.totalOrders ?? 0),
        verifiedRevenueInr: Number(summary.verifiedRevenueInr ?? 0),
        pendingVerification: Number(summary.pendingVerification ?? 0),
        sampleRequests: Number(summary.sampleRequests ?? 0),
        averageOrderInr: Math.round(Number(summary.averageOrderInr ?? 0)),
      },
      revenueByDay: fillDailySeries(Math.round(effectiveDays), since, revenueRows.map((row) => ({
        date: row.date,
        orderCount: Number(row.orderCount ?? 0),
        revenueInr: Number(row.revenueInr ?? 0),
      }))),
      ordersByStatus: statusRows.map((row) => ({ status: row.status, count: Number(row.count ?? 0) })),
      paymentsByStatus: paymentRows.map((row) => ({ status: row.status, count: Number(row.count ?? 0) })),
      topProducts: topProducts.map((row) => ({
        productName: row.productName,
        quantity: Number(row.quantity ?? 0),
        revenueInr: Number(row.revenueInr ?? 0),
      })),
      customerGrowth: fillCountSeries(Math.round(effectiveDays), since, customerRows.map((row) => ({
        date: row.date,
        count: Number(row.count ?? 0),
      }))),
      traffic: {
        pageViews: Number(trafficSummary.pageViews ?? 0),
        uniqueVisitors: Number(trafficSummary.uniqueVisitors ?? 0),
        sessions: Number(trafficSummary.sessions ?? 0),
        topPages: topPages.map((row) => ({
          path: row.path,
          views: Number(row.views ?? 0),
          visitors: Number(row.visitors ?? 0),
        })),
        referrers: referrers.map((row) => ({
          referrer: row.referrer,
          views: Number(row.views ?? 0),
        })),
        sources: sources.map((row) => ({
          source: row.source,
          views: Number(row.views ?? 0),
        })),
      },
      vendorBreakdown: vendorBreakdownRows.map((row) => ({
        vendorId: row.vendorId,
        storeName: row.storeName,
        orderCount: Number(row.orderCount ?? 0),
        revenueInr: Number(row.revenueInr ?? 0),
        commissionAmount: Number(row.commissionAmount ?? 0),
      })),
    };

    if (format === "csv") {
      return new NextResponse(toCsv(data.revenueByDay), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="buywell-analytics-${days}d.csv"`,
        },
      });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    return handleApiError(err);
  }
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function fillDailySeries(days: number, since: Date, rows: Array<{ date: string; orderCount: number; revenueInr: number }>) {
  const byDate = new Map(rows.map((row) => [row.date, row]));
  return makeDates(days, since).map((date) => byDate.get(date) ?? { date, orderCount: 0, revenueInr: 0 });
}

function fillCountSeries(days: number, since: Date, rows: Array<{ date: string; count: number }>) {
  const byDate = new Map(rows.map((row) => [row.date, row.count]));
  return makeDates(days, since).map((date) => ({ date, count: byDate.get(date) ?? 0 }));
}

function makeDates(days: number, since: Date): string[] {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(since);
    date.setDate(since.getDate() + index + 1);
    return date.toISOString().slice(0, 10);
  });
}

function toCsv(rows: Array<{ date: string; orderCount: number; revenueInr: number }>): string {
  return [
    "date,orders,verified_revenue_inr",
    ...rows.map((row) => `${row.date},${row.orderCount},${(row.revenueInr / 100).toFixed(2)}`),
  ].join("\n");
}
