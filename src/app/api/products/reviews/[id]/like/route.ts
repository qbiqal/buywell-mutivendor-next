import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { productReviewLikes, productReviews } from "@/lib/db/schema";
import { handleApiError, NotFoundError } from "@/lib/errors";
import { createAuthGuard, getAuthPayload } from "@/lib/middleware";
import { requireModuleApi } from "@/lib/modules";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const moduleResult = await requireModuleApi("ecommerce");
    if (moduleResult) return moduleResult;
    const authResult = await createAuthGuard()(req);
    if (authResult) return authResult;
    const payload = await getAuthPayload(req);
    const { id } = await params;

    const [review] = await db.select().from(productReviews).where(eq(productReviews.id, id)).limit(1);
    if (!review || review.status !== "approved") throw new NotFoundError("Review");

    const [existing] = await db.select().from(productReviewLikes)
      .where(and(eq(productReviewLikes.reviewId, id), eq(productReviewLikes.userId, payload!.sub)))
      .limit(1);
    const nextCount = Math.max(0, review.likeCount + (existing ? -1 : 1));
    if (existing) await db.delete(productReviewLikes).where(eq(productReviewLikes.id, existing.id));
    else await db.insert(productReviewLikes).values({ reviewId: id, userId: payload!.sub });
    await db.update(productReviews).set({ likeCount: nextCount, updatedAt: new Date() }).where(eq(productReviews.id, id));

    return NextResponse.json({ success: true, data: { liked: !existing, likeCount: nextCount } });
  } catch (err) {
    return handleApiError(err);
  }
}
