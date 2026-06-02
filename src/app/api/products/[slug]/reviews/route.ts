import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { productReviews, products, users } from "@/lib/db/schema";
import { handleApiError, NotFoundError, ValidationError } from "@/lib/errors";
import { createAuthGuard, getAuthPayload } from "@/lib/middleware";
import { requireModuleApi } from "@/lib/modules";
import { moderationStatusForText } from "@/lib/moderation";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const moduleResult = await requireModuleApi("ecommerce");
    if (moduleResult) return moduleResult;
    const { slug } = await params;
    const [product] = await db.select({ id: products.id }).from(products)
      .where(and(eq(products.slug, slug), eq(products.isActive, true)))
      .limit(1);
    if (!product) throw new NotFoundError("Product");

    const rows = await db.select({
      id: productReviews.id,
      rating: productReviews.rating,
      title: productReviews.title,
      body: productReviews.body,
      likeCount: productReviews.likeCount,
      mediaUrl: productReviews.mediaUrl,
      createdAt: productReviews.createdAt,
      firstName: users.firstName,
      lastName: users.lastName,
    })
      .from(productReviews)
      .innerJoin(users, eq(users.id, productReviews.userId))
      .where(and(eq(productReviews.productId, product.id), eq(productReviews.status, "approved")))
      .orderBy(desc(productReviews.createdAt));

    return NextResponse.json({ success: true, data: rows });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const moduleResult = await requireModuleApi("ecommerce");
    if (moduleResult) return moduleResult;
    const authResult = await createAuthGuard()(req);
    if (authResult) return authResult;
    const payload = await getAuthPayload(req);
    const { slug } = await params;
    const [product] = await db.select({ id: products.id }).from(products)
      .where(and(eq(products.slug, slug), eq(products.isActive, true)))
      .limit(1);
    if (!product) throw new NotFoundError("Product");

    const body = await req.json();
    const rating = Math.max(1, Math.min(5, parseInt(String(body.rating ?? "5"), 10)));
    const text = String(body.body ?? "").trim();
    if (text.length < 5) throw new ValidationError("Review is too short");

    const [review] = await db.insert(productReviews).values({
      productId: product.id,
      userId: payload!.sub,
      orderId: body.orderId || null,
      rating,
      title: nullableText(body.title),
      body: text,
      mediaUrl: nullableText(body.mediaUrl),
      status: moderationStatusForText(`${body.title ?? ""} ${text}`),
    }).returning();

    return NextResponse.json({
      success: true,
      data: review,
      message: review.status === "spam" ? "Review held for moderation" : "Review submitted for approval",
    }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

function nullableText(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text ? text : null;
}
