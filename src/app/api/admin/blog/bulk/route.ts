import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { blogPosts } from "@/lib/db/schema";
import { eq, and, inArray, ilike, or, gte, lte, type SQL } from "drizzle-orm";
import { createAdminGuard } from "@/lib/middleware";
import { handleApiError } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;

    const body = await req.json();
    const { action, selectedIds, selectAll, filters } = body;

    if (action !== "delete") {
      return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
    }

    let idsToDelete: string[] = [];

    if (selectAll && filters) {
      const { search, status, categoryId, featured, dateFrom, dateTo, minViews, maxViews, minReadTime, maxReadTime } = filters;
      const conditions: SQL[] = [];
      
      if (status) conditions.push(eq(blogPosts.status, status));
      if (categoryId) conditions.push(eq(blogPosts.categoryId, categoryId));
      if (featured === "true") conditions.push(eq(blogPosts.isFeatured, true));
      if (featured === "false") conditions.push(eq(blogPosts.isFeatured, false));
      if (dateFrom) conditions.push(gte(blogPosts.createdAt, new Date(`${dateFrom}T00:00:00.000Z`)));
      if (dateTo) conditions.push(lte(blogPosts.createdAt, new Date(`${dateTo}T23:59:59.999Z`)));
      if (minViews) conditions.push(gte(blogPosts.viewCount, Number(minViews)));
      if (maxViews) conditions.push(lte(blogPosts.viewCount, Number(maxViews)));
      if (minReadTime) conditions.push(gte(blogPosts.readTime, Number(minReadTime)));
      if (maxReadTime) conditions.push(lte(blogPosts.readTime, Number(maxReadTime)));
      
      if (search) {
        conditions.push(or(
          ilike(blogPosts.title, `%${search}%`),
          ilike(blogPosts.slug, `%${search}%`),
          ilike(blogPosts.excerpt, `%${search}%`),
          ilike(blogPosts.metaDesc, `%${search}%`)
        ) as SQL);
      }

      const rows = await db.select({ id: blogPosts.id }).from(blogPosts).where(conditions.length > 0 ? and(...conditions) : undefined);
      idsToDelete = rows.map(r => r.id);
    } else if (selectedIds && Array.isArray(selectedIds)) {
      idsToDelete = selectedIds;
    }

    if (idsToDelete.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    await db.delete(blogPosts).where(inArray(blogPosts.id, idsToDelete));

    return NextResponse.json({ success: true, count: idsToDelete.length });
  } catch (err) {
    return handleApiError(err);
  }
}
