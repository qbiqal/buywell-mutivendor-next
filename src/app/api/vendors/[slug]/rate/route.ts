import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vendors, vendorRatings } from "@/lib/db/schema";
import { eq, and, avg, sql } from "drizzle-orm";
import { getAuthPayload } from "@/lib/middleware";
import { handleApiError, NotFoundError, ValidationError } from "@/lib/errors";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const payload = await getAuthPayload(req);
    if (!payload) return NextResponse.json({ myRating: null });

    const { slug } = await params;
    const [vendor] = await db.select({ id: vendors.id })
      .from(vendors).where(eq(vendors.storeSlug, slug)).limit(1);
    if (!vendor) throw new NotFoundError("Vendor");

    const [existing] = await db.select({ rating: vendorRatings.rating, review: vendorRatings.review })
      .from(vendorRatings)
      .where(and(eq(vendorRatings.vendorId, vendor.id), eq(vendorRatings.userId, payload.sub)))
      .limit(1);

    return NextResponse.json({ myRating: existing ?? null });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const payload = await getAuthPayload(req);
    if (!payload) return NextResponse.json({ success: false, error: "Login required" }, { status: 401 });

    const { slug } = await params;
    const [vendor] = await db.select({ id: vendors.id })
      .from(vendors).where(eq(vendors.storeSlug, slug)).limit(1);
    if (!vendor) throw new NotFoundError("Vendor");

    const body = await req.json();
    const { rating, review } = body;
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new ValidationError("Rating must be an integer 1–5");
    }

    // Upsert
    const [existing] = await db.select({ id: vendorRatings.id })
      .from(vendorRatings)
      .where(and(eq(vendorRatings.vendorId, vendor.id), eq(vendorRatings.userId, payload.sub)))
      .limit(1);

    if (existing) {
      await db.update(vendorRatings)
        .set({ rating, review: review || null, updatedAt: new Date() })
        .where(eq(vendorRatings.id, existing.id));
    } else {
      await db.insert(vendorRatings).values({
        vendorId: vendor.id,
        userId: payload.sub,
        rating,
        review: review || null,
      });
    }

    // Recalculate average and update vendor rating
    const [avgRow] = await db.select({ avg: avg(vendorRatings.rating) })
      .from(vendorRatings)
      .where(eq(vendorRatings.vendorId, vendor.id));

    const newAverage = avgRow?.avg ? parseFloat(String(avgRow.avg)).toFixed(2) : "0.00";
    await db.update(vendors).set({ rating: newAverage, updatedAt: new Date() }).where(eq(vendors.id, vendor.id));

    return NextResponse.json({ success: true, rating: { rating, review: review || null }, newAverage });
  } catch (err) {
    return handleApiError(err);
  }
}
