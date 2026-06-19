import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, and, ilike, or, gte, lte, inArray, type SQL } from "drizzle-orm";
import { createAdminGuard } from "@/lib/middleware";
import { handleApiError } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;

    const body = await req.json();
    const { action, selectedIds, selectAll, filters } = body;

    if (action !== "disable") {
      return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
    }

    let idsToUpdate: string[] = [];

    if (selectAll && filters) {
      const { search, status, verified, role, dateFrom, dateTo } = filters;
      const conditions: SQL[] = [];
      
      if (status === "active") conditions.push(eq(users.isActive, true));
      if (status === "inactive") conditions.push(eq(users.isActive, false));
      if (verified === "true") conditions.push(eq(users.emailVerified, true));
      if (verified === "false") conditions.push(eq(users.emailVerified, false));
      if (role) conditions.push(eq(users.role, role));
      if (dateFrom) conditions.push(gte(users.createdAt, new Date(`${dateFrom}T00:00:00.000Z`)));
      if (dateTo) conditions.push(lte(users.createdAt, new Date(`${dateTo}T23:59:59.999Z`)));
      
      if (search) {
        conditions.push(or(
          ilike(users.email, `%${search}%`),
          ilike(users.firstName, `%${search}%`),
          ilike(users.lastName, `%${search}%`),
          ilike(users.phone, `%${search}%`)
        ) as SQL);
      }

      const rows = await db.select({ id: users.id }).from(users).where(conditions.length > 0 ? and(...conditions) : undefined);
      idsToUpdate = rows.map(r => r.id);
    } else if (selectedIds && Array.isArray(selectedIds)) {
      idsToUpdate = selectedIds;
    }

    if (idsToUpdate.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    // Disable the users
    await db.update(users).set({ isActive: false }).where(inArray(users.id, idsToUpdate));

    return NextResponse.json({ success: true, count: idsToUpdate.length });
  } catch (err) {
    return handleApiError(err);
  }
}
