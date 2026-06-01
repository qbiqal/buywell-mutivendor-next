import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, gte, ilike, lte, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders, users } from "@/lib/db/schema";
import { createAdminGuard } from "@/lib/middleware";
import { handleApiError } from "@/lib/errors";
import { requireModuleApi } from "@/lib/modules";

function numberParam(value: string | null) {
  if (!value || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(req: NextRequest) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;
    const moduleResult = await requireModuleApi("ecommerce");
    if (moduleResult) return moduleResult;

    const { searchParams } = req.nextUrl;
    const search = searchParams.get("search")?.trim();
    const status = searchParams.get("status");
    const verified = searchParams.get("verified");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const minOrders = numberParam(searchParams.get("minOrders"));
    const maxOrders = numberParam(searchParams.get("maxOrders"));
    const minSpend = numberParam(searchParams.get("minSpend"));
    const maxSpend = numberParam(searchParams.get("maxSpend"));
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20"));
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [eq(users.role, "customer")];
    if (status === "active") conditions.push(eq(users.isActive, true));
    if (status === "inactive") conditions.push(eq(users.isActive, false));
    if (verified === "true") conditions.push(eq(users.emailVerified, true));
    if (verified === "false") conditions.push(eq(users.emailVerified, false));
    if (dateFrom) conditions.push(gte(users.createdAt, new Date(`${dateFrom}T00:00:00.000Z`)));
    if (dateTo) conditions.push(lte(users.createdAt, new Date(`${dateTo}T23:59:59.999Z`)));
    if (search) {
      const searchClause = or(
        ilike(users.firstName, `%${search}%`),
        ilike(users.lastName, `%${search}%`),
        ilike(users.email, `%${search}%`),
        ilike(users.phone, `%${search}%`),
      );
      if (searchClause) conditions.push(searchClause);
    }

    const whereClause = and(...conditions);
    const havingConditions: SQL[] = [];
    if (minOrders !== null) havingConditions.push(sql`count(${orders.id}) >= ${minOrders}`);
    if (maxOrders !== null) havingConditions.push(sql`count(${orders.id}) <= ${maxOrders}`);
    if (minSpend !== null) havingConditions.push(sql`coalesce(sum(${orders.totalInr}), 0) >= ${Math.round(minSpend * 100)}`);
    if (maxSpend !== null) havingConditions.push(sql`coalesce(sum(${orders.totalInr}), 0) <= ${Math.round(maxSpend * 100)}`);
    const havingClause = havingConditions.length > 0 ? and(...havingConditions) : undefined;

    const rows = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        phone: users.phone,
        isActive: users.isActive,
        emailVerified: users.emailVerified,
        createdAt: users.createdAt,
        orderCount: sql<number>`count(${orders.id})`,
        totalSpendInr: sql<number>`coalesce(sum(${orders.totalInr}), 0)`,
        lastOrderAt: sql<Date | null>`max(${orders.createdAt})`,
        totalRows: sql<number>`count(*) over()`,
      })
      .from(users)
      .leftJoin(orders, eq(orders.userId, users.id))
      .where(whereClause)
      .groupBy(users.id)
      .having(havingClause)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    const total = Number(rows[0]?.totalRows ?? 0);
    return NextResponse.json({
      success: true,
      data: rows.map((row) => ({
        ...row,
        orderCount: Number(row.orderCount ?? 0),
        totalSpendInr: Number(row.totalSpendInr ?? 0),
        totalRows: undefined,
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
