import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { blogComments, blogPosts, users } from "@/lib/db/schema";
import { handleApiError, NotFoundError, ValidationError } from "@/lib/errors";
import { createAdminGuard, getAuthPayload } from "@/lib/middleware";
import { requireModuleApi } from "@/lib/modules";

const STATUSES = new Set(["pending", "approved", "rejected", "spam"]);

export async function GET(req: NextRequest) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;
    const moduleResult = await requireModuleApi("blog");
    if (moduleResult) return moduleResult;

    const status = req.nextUrl.searchParams.get("status") ?? "";
    const search = req.nextUrl.searchParams.get("search") ?? "";
    const conditions: SQL[] = [];
    if (status && STATUSES.has(status)) conditions.push(eq(blogComments.status, status));
    if (search) {
      const like = `%${search}%`;
      conditions.push(or(ilike(blogComments.body, like), ilike(blogPosts.title, like), ilike(users.email, like))!);
    }

    const rows = await db.select({
      id: blogComments.id,
      postId: blogComments.postId,
      parentId: blogComments.parentId,
      body: blogComments.body,
      status: blogComments.status,
      likeCount: blogComments.likeCount,
      createdAt: blogComments.createdAt,
      postTitle: blogPosts.title,
      postSlug: blogPosts.slug,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
    })
      .from(blogComments)
      .innerJoin(blogPosts, eq(blogPosts.id, blogComments.postId))
      .innerJoin(users, eq(users.id, blogComments.userId))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(blogComments.createdAt))
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
    const moduleResult = await requireModuleApi("blog");
    if (moduleResult) return moduleResult;
    const payload = await getAuthPayload(req);

    const body = await req.json();
    const id = String(body.id ?? "");
    const status = String(body.status ?? "");
    if (!id) throw new ValidationError("Comment id is required");
    if (!STATUSES.has(status)) throw new ValidationError("Invalid comment status");

    const [comment] = await db.update(blogComments).set({
      status,
      moderatedBy: payload!.sub,
      moderatedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(blogComments.id, id)).returning();
    if (!comment) throw new NotFoundError("Comment");

    return NextResponse.json({ success: true, data: comment });
  } catch (err) {
    return handleApiError(err);
  }
}
