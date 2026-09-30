import { NextRequest, NextResponse } from "next/server";
import { createAdminGuard } from "@/lib/middleware";
import { handleApiError } from "@/lib/errors";
import { distributeProfitShareForOrder } from "@/lib/profit-share";

// POST /api/admin/orders/[id]/profit-share — (re)send an order's profit share to BuyWell Global. Idempotent.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;
    const { id } = await params;
    const result = await distributeProfitShareForOrder(id);
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    return handleApiError(err);
  }
}
