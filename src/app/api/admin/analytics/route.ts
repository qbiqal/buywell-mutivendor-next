import { NextRequest, NextResponse } from "next/server";
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { orderItems, orders, trafficEvents, users } from "@/lib/db/schema";
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
    const days = clamp(parseInt(searchParams.get("days") ?? "30"), 7, 365);
    const format = searchParams.get("format");
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [summaryRows, revenueRows, statusRows, paymentRows, topProducts, customerRows, trafficSummaryRows, topPages, referrers, sources] = await Promise.all([
      db
        .select({
          totalOrders: sql<number>`count(*)`,
          verifiedRevenueInr: sql<number>`coalesce(sum(case when ${orders.paymentStatus} = 'verified' then ${orders.totalInr} else 0 end), 0)`,
          pendingVerification: sql<number>`count(*) filter (where ${orders.paymentStatus} = 'uploaded')`,
          sampleRequests: sql<number>`count(*) filter (where ${orders.isSampleRequest} = true)`,
          averageOrderInr: sql<number>`coalesce(avg(${orders.totalInr}), 0)`,
        })
        .from(orders)
        .where(gte(orders.createdAt, since)),
      db
        .select({
          date: sql<string>`to_char(date_trunc('day', ${orders.createdAt}), 'YYYY-MM-DD')`,
          orderCount: sql<number>`count(*)`,
          revenueInr: sql<number>`coalesce(sum(case when ${orders.paymentStatus} = 'verified' then ${orders.totalInr} else 0 end), 0)`,
        })
        .from(orders)
        .where(gte(orders.createdAt, since))
        .groupBy(sql`date_trunc('day', ${orders.createdAt})`)
        .orderBy(sql`date_trunc('day', ${orders.createdAt})`),
      db
        .select({
          status: orders.status,
          count: sql<number>`count(*)`,
        })
        .from(orders)
        .where(gte(orders.createdAt, since))
        .groupBy(orders.status)
        .orderBy(sql`count(*) desc`),
      db
        .select({
          status: orders.paymentStatus,
          count: sql<number>`count(*)`,
        })
        .from(orders)
        .where(gte(orders.createdAt, since))
        .groupBy(orders.paymentStatus)
        .orderBy(sql`count(*) desc`),
      db
        .select({
          productName: sql<string>`coalesce(${orderItems.productSnapshot}->>'productName', ${orderItems.productSnapshot}->>'name', 'Unknown')`,
          quantity: sql<number>`sum(${orderItems.quantity})`,
          revenueInr: sql<number>`sum(${orderItems.totalInr})`,
        })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .where(and(gte(orders.createdAt, since), sql`${orders.status} != 'cancelled'`))
        .groupBy(sql`coalesce(${orderItems.productSnapshot}->>'productName', ${orderItems.productSnapshot}->>'name', 'Unknown')`)
        .orderBy(sql`sum(${orderItems.totalInr}) desc`)
        .limit(10),
      db
        .select({
          date: sql<string>`to_char(date_trunc('day', ${users.createdAt}), 'YYYY-MM-DD')`,
          count: sql<number>`count(*)`,
        })
        .from(users)
        .where(and(eq(users.role, "customer"), gte(users.createdAt, since)))
        .groupBy(sql`date_trunc('day', ${users.createdAt})`)
        .orderBy(sql`date_trunc('day', ${users.createdAt})`),
      db
        .select({
          pageViews: sql<number>`count(*)`,
          uniqueVisitors: sql<number>`count(distinct ${trafficEvents.visitorId})`,
          sessions: sql<number>`count(distinct ${trafficEvents.sessionId})`,
        })
        .from(trafficEvents)
        .where(gte(trafficEvents.createdAt, since)),
      db
        .select({
          path: trafficEvents.path,
          views: sql<number>`count(*)`,
          visitors: sql<number>`count(distinct ${trafficEvents.visitorId})`,
        })
        .from(trafficEvents)
        .where(gte(trafficEvents.createdAt, since))
        .groupBy(trafficEvents.path)
        .orderBy(sql`count(*) desc`)
        .limit(10),
      db
        .select({
          referrer: sql<string>`coalesce(nullif(${trafficEvents.referrer}, ''), 'Direct')`,
          views: sql<number>`count(*)`,
        })
        .from(trafficEvents)
        .where(gte(trafficEvents.createdAt, since))
        .groupBy(sql`coalesce(nullif(${trafficEvents.referrer}, ''), 'Direct')`)
        .orderBy(sql`count(*) desc`)
        .limit(8),
      db
        .select({
          source: sql<string>`coalesce(nullif(${trafficEvents.source}, ''), 'direct')`,
          views: sql<number>`count(*)`,
        })
        .from(trafficEvents)
        .where(gte(trafficEvents.createdAt, since))
        .groupBy(sql`coalesce(nullif(${trafficEvents.source}, ''), 'direct')`)
        .orderBy(sql`count(*) desc`)
        .limit(8),
    ]);

    const summary = summaryRows[0] ?? {
      totalOrders: 0,
      verifiedRevenueInr: 0,
      pendingVerification: 0,
      sampleRequests: 0,
      averageOrderInr: 0,
    };
    const trafficSummary = trafficSummaryRows[0] ?? { pageViews: 0, uniqueVisitors: 0, sessions: 0 };

    const data = {
      range: { days, since: since.toISOString() },
      summary: {
        totalOrders: Number(summary.totalOrders ?? 0),
        verifiedRevenueInr: Number(summary.verifiedRevenueInr ?? 0),
        pendingVerification: Number(summary.pendingVerification ?? 0),
        sampleRequests: Number(summary.sampleRequests ?? 0),
        averageOrderInr: Math.round(Number(summary.averageOrderInr ?? 0)),
      },
      revenueByDay: fillDailySeries(days, since, revenueRows.map((row) => ({
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
      customerGrowth: fillCountSeries(days, since, customerRows.map((row) => ({
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
    };

    if (format === "csv") {
      return new NextResponse(toCsv(data.revenueByDay), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename=\"apras-analytics-${days}d.csv\"`,
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
