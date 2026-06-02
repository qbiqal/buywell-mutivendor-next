import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { blogComments, blogPosts, users } from "@/lib/db/schema";
import { handleApiError, NotFoundError, ValidationError } from "@/lib/errors";
import { createAuthGuard, getAuthPayload } from "@/lib/middleware";
import { requireModuleApi } from "@/lib/modules";
import { moderationStatusForText } from "@/lib/moderation";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const moduleResult = await requireModuleApi("blog");
    if (moduleResult) return moduleResult;

    const { slug } = await params;
    const [post] = await db.select({ id: blogPosts.id }).from(blogPosts)
      .where(and(eq(blogPosts.slug, slug), eq(blogPosts.status, "published")))
      .limit(1);
    if (!post) throw new NotFoundError("Blog post");

    const rows = await db.select({
      id: blogComments.id,
      parentId: blogComments.parentId,
      body: blogComments.body,
      likeCount: blogComments.likeCount,
      createdAt: blogComments.createdAt,
      firstName: users.firstName,
      lastName: users.lastName,
      avatarUrl: users.avatarUrl,
    })
      .from(blogComments)
      .innerJoin(users, eq(users.id, blogComments.userId))
      .where(and(eq(blogComments.postId, post.id), eq(blogComments.status, "approved")))
      .orderBy(asc(blogComments.createdAt));

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
    const moduleResult = await requireModuleApi("blog");
    if (moduleResult) return moduleResult;
    const authResult = await createAuthGuard()(req);
    if (authResult) return authResult;
    const payload = await getAuthPayload(req);

    const { slug } = await params;
    const [post] = await db.select({ id: blogPosts.id }).from(blogPosts)
      .where(and(eq(blogPosts.slug, slug), eq(blogPosts.status, "published")))
      .limit(1);
    if (!post) throw new NotFoundError("Blog post");

    const body = await req.json();
    const text = String(body.body ?? "").trim();
    if (text.length < 3) throw new ValidationError("Comment is too short");

    const [comment] = await db.insert(blogComments).values({
      postId: post.id,
      parentId: body.parentId || null,
      userId: payload!.sub,
      body: text,
      status: moderationStatusForText(text),
    }).returning();

    return NextResponse.json({
      success: true,
      data: comment,
      message: comment.status === "spam" ? "Comment held for moderation" : "Comment submitted for approval",
    }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
