import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hsnCodes, taxRates } from "@/lib/db/schema";
import { eq, ilike, and } from "drizzle-orm";
import { createAdminGuard } from "@/lib/middleware";
import { handleApiError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") ?? "";
    const limit  = Math.min(50, parseInt(searchParams.get("limit") ?? "20"));

    const rows = await db
      .select({
        id:          hsnCodes.id,
        code:        hsnCodes.code,
        description: hsnCodes.description,
        chapter:     hsnCodes.chapter,
        taxRateId:   hsnCodes.taxRateId,
        taxRateName: taxRates.name,
        totalRate:   taxRates.totalRate,
        cgstRate:    taxRates.cgstRate,
        sgstRate:    taxRates.sgstRate,
        igstRate:    taxRates.igstRate,
      })
      .from(hsnCodes)
      .leftJoin(taxRates, eq(taxRates.id, hsnCodes.taxRateId))
      .where(
        and(
          eq(hsnCodes.isActive, true),
          search
            ? ilike(hsnCodes.code, `${search}%`) // match code prefix first
            : undefined,
        ),
      )
      .limit(limit);

    // Also search by description if fewer than limit results
    let results = rows;
    if (search && rows.length < limit) {
      const descRows = await db
        .select({
          id:          hsnCodes.id,
          code:        hsnCodes.code,
          description: hsnCodes.description,
          chapter:     hsnCodes.chapter,
          taxRateId:   hsnCodes.taxRateId,
          taxRateName: taxRates.name,
          totalRate:   taxRates.totalRate,
          cgstRate:    taxRates.cgstRate,
          sgstRate:    taxRates.sgstRate,
          igstRate:    taxRates.igstRate,
        })
        .from(hsnCodes)
        .leftJoin(taxRates, eq(taxRates.id, hsnCodes.taxRateId))
        .where(and(eq(hsnCodes.isActive, true), ilike(hsnCodes.description, `%${search}%`)))
        .limit(limit - rows.length);
      const existingIds = new Set(rows.map((r) => r.id));
      results = [...rows, ...descRows.filter((r) => !existingIds.has(r.id))];
    }

    return NextResponse.json({ success: true, hsnCodes: results });
  } catch (err) {
    return handleApiError(err);
  }
}
