import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { productCategories } from "@/lib/db/schema";
import { inArray } from "drizzle-orm";
import { createAdminGuard } from "@/lib/middleware";
import { handleApiError } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;

    const body = await req.json();
    const { action, selectedIds } = body;

    if (action !== "delete") {
      return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
    }

    if (!selectedIds || !Array.isArray(selectedIds) || selectedIds.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    // You could optionally check if these categories are used in products, and error out
    // But for simplicity of bulk delete, we'll just delete them. Products with these category IDs will have dangling IDs or fallback.
    await db.delete(productCategories).where(inArray(productCategories.id, selectedIds));

    return NextResponse.json({ success: true, count: selectedIds.length });
  } catch (err) {
    return handleApiError(err);
  }
}
