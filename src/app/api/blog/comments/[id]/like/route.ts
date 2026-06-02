import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { blogCommentLikes, blogComments } from "@/lib/db/schema";
import { handleApiError, NotFoundError } from "@/lib/errors";
import { createAuthGuard, getAuthPayload } from "@/lib/middleware";
import { requireModuleApi } from "@/lib/modules";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const moduleResult = await requireModuleApi("blog");
    if (moduleResult) return moduleResult;
    const authResult = await createAuthGuard()(req);
    if (authResult) return authResult;
    const payload = await getAuthPayload(req);
    const { id } = await params;

    const [comment] = await db.select().from(blogComments).where(eq(blogComments.id, id)).limit(1);
    if (!comment || comment.status !== "approved") throw new NotFoundError("Comment");

    const [existing] = await db.select().from(blogCommentLikes)
      .where(and(eq(blogCommentLikes.commentId, id), eq(blogCommentLikes.userId, payload!.sub)))
      .limit(1);

    const nextCount = Math.max(0, comment.likeCount + (existing ? -1 : 1));
    if (existing) {
      await db.delete(blogCommentLikes).where(eq(blogCommentLikes.id, existing.id));
    } else {
      await db.insert(blogCommentLikes).values({ commentId: id, userId: payload!.sub });
    }
    await db.update(blogComments).set({ likeCount: nextCount, updatedAt: new Date() }).where(eq(blogComments.id, id));

    return NextResponse.json({ success: true, data: { liked: !existing, likeCount: nextCount } });
  } catch (err) {
    return handleApiError(err);
  }
}
