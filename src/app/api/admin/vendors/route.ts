import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vendors, users } from "@/lib/db/schema";
import { eq, desc, ilike, and } from "drizzle-orm";
import { createAdminGuard } from "@/lib/middleware";

export async function GET(req: NextRequest) {
  const authResult = await createAdminGuard()(req);
  if (authResult) return authResult;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");
  const status = searchParams.get("status");

  const where = and(
    status ? eq(vendors.status, status as "pending" | "approved" | "suspended" | "rejected") : undefined,
    search ? ilike(vendors.storeName, `%${search}%`) : undefined,
  );

  const rows = await db.select({
    id: vendors.id,
    storeName: vendors.storeName,
    storeSlug: vendors.storeSlug,
    email: vendors.email,
    phone: vendors.phone,
    status: vendors.status,
    rating: vendors.rating,
    totalSales: vendors.totalSales,
    commissionOverride: vendors.commissionOverride,
    createdAt: vendors.createdAt,
    userId: vendors.userId,
    logoUrl: vendors.logoUrl,
    userEmail: users.email,
    userName: users.firstName,
  })
  .from(vendors)
  .leftJoin(users, eq(users.id, vendors.userId))
  .where(where)
  .orderBy(desc(vendors.createdAt))
  .limit(100);

  return NextResponse.json({ success: true, vendors: rows });
}
