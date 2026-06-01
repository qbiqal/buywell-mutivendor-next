import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { addresses, orders, users } from "@/lib/db/schema";
import { createAdminGuard } from "@/lib/middleware";
import { handleApiError, NotFoundError, ValidationError } from "@/lib/errors";
import { requireModuleApi } from "@/lib/modules";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;
    const moduleResult = await requireModuleApi("ecommerce");
    if (moduleResult) return moduleResult;

    const { id } = await params;
    const customerRows = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        phone: users.phone,
        isActive: users.isActive,
        emailVerified: users.emailVerified,
        avatarUrl: users.avatarUrl,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(and(eq(users.id, id), eq(users.role, "customer")))
      .limit(1);

    if (!customerRows[0]) throw new NotFoundError("Customer");

    const [addressRows, orderRows, statRows] = await Promise.all([
      db.select().from(addresses).where(eq(addresses.userId, id)).orderBy(desc(addresses.isDefault), desc(addresses.createdAt)),
      db
        .select({
          id: orders.id,
          orderNumber: orders.orderNumber,
          status: orders.status,
          paymentStatus: orders.paymentStatus,
          totalInr: orders.totalInr,
          isSampleRequest: orders.isSampleRequest,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .where(eq(orders.userId, id))
        .orderBy(desc(orders.createdAt))
        .limit(20),
      db
        .select({
          orderCount: sql<number>`count(${orders.id})`,
          totalSpendInr: sql<number>`coalesce(sum(${orders.totalInr}), 0)`,
          lastOrderAt: sql<Date | null>`max(${orders.createdAt})`,
        })
        .from(orders)
        .where(eq(orders.userId, id)),
    ]);

    const stats = statRows[0] ?? { orderCount: 0, totalSpendInr: 0, lastOrderAt: null };
    return NextResponse.json({
      success: true,
      data: {
        customer: customerRows[0],
        addresses: addressRows,
        orders: orderRows,
        stats: {
          orderCount: Number(stats.orderCount ?? 0),
          totalSpendInr: Number(stats.totalSpendInr ?? 0),
          lastOrderAt: stats.lastOrderAt,
        },
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;
    const moduleResult = await requireModuleApi("ecommerce");
    if (moduleResult) return moduleResult;

    const { id } = await params;
    const body = await req.json();
    if (typeof body.isActive !== "boolean") {
      throw new ValidationError("isActive boolean is required");
    }

    const rows = await db
      .update(users)
      .set({ isActive: body.isActive, updatedAt: new Date() })
      .where(and(eq(users.id, id), eq(users.role, "customer")))
      .returning({
        id: users.id,
        isActive: users.isActive,
        updatedAt: users.updatedAt,
      });

    if (!rows[0]) throw new NotFoundError("Customer");
    return NextResponse.json({ success: true, data: rows[0] });
  } catch (err) {
    return handleApiError(err);
  }
}
