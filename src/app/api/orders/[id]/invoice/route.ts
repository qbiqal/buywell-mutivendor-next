import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vendors } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getAuthPayload } from "@/lib/middleware";
import { isAdminRole } from "@/lib/auth";
import { buildInvoice, type InvoiceViewer } from "@/lib/invoice";

// GET /api/orders/[id]/invoice — printable GST invoice for the order owner, admins, and involved vendors.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = await getAuthPayload(req);
  if (!payload) return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });

  let viewer: InvoiceViewer;
  if (isAdminRole(payload.role)) {
    viewer = { userId: payload.sub, role: "admin" };
  } else if (payload.role === "vendor") {
    const [vendor] = await db.select({ id: vendors.id }).from(vendors).where(eq(vendors.userId, payload.sub)).limit(1);
    if (!vendor) return NextResponse.json({ success: false, error: "Vendor not found" }, { status: 403 });
    viewer = { userId: payload.sub, role: "vendor", vendorId: vendor.id };
  } else {
    viewer = { userId: payload.sub, role: "customer" };
  }

  const result = await buildInvoice(id, viewer);
  if (!result.ok) return NextResponse.json({ success: false, error: result.error }, { status: result.status });

  return new NextResponse(result.html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
