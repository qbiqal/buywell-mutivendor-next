import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { productReviews, products, users } from "@/lib/db/schema";
import { handleApiError, NotFoundError, ValidationError } from "@/lib/errors";
import { createAdminGuard, getAuthPayload } from "@/lib/middleware";
import { requireModuleApi } from "@/lib/modules";

const STATUSES = new Set(["pending", "approved", "rejected", "spam"]);

export async function GET(req: NextRequest) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;
    const moduleResult = await requireModuleApi("ecommerce");
    if (moduleResult) return moduleResult;

    const status = req.nextUrl.searchParams.get("status") ?? "";
    const search = req.nextUrl.searchParams.get("search") ?? "";
    const conditions: SQL[] = [];
    if (status && STATUSES.has(status)) conditions.push(eq(productReviews.status, status));
    if (search) {
      const like = `%${search}%`;
      conditions.push(or(ilike(productReviews.body, like), ilike(products.name, like), ilike(users.email, like))!);
    }

    const rows = await db.select({
      id: productReviews.id,
      rating: productReviews.rating,
      title: productReviews.title,
      body: productReviews.body,
      status: productReviews.status,
      likeCount: productReviews.likeCount,
      createdAt: productReviews.createdAt,
      productName: products.name,
      productSlug: products.slug,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
    })
      .from(productReviews)
      .innerJoin(products, eq(products.id, productReviews.productId))
      .innerJoin(users, eq(users.id, productReviews.userId))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(productReviews.createdAt))
      .limit(200);

    return NextResponse.json({ success: true, data: rows });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;
    const moduleResult = await requireModuleApi("ecommerce");
    if (moduleResult) return moduleResult;
    const payload = await getAuthPayload(req);

    const body = await req.json();
    const id = String(body.id ?? "");
    const status = String(body.status ?? "");
    if (!id) throw new ValidationError("Review id is required");
    if (!STATUSES.has(status)) throw new ValidationError("Invalid review status");

    const [review] = await db.update(productReviews).set({
      status,
      moderatedBy: payload!.sub,
      moderatedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(productReviews.id, id)).returning();
    if (!review) throw new NotFoundError("Review");
    return NextResponse.json({ success: true, data: review });
  } catch (err) {
    return handleApiError(err);
  }
}
