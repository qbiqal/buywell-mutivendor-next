import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { media } from "@/lib/db/schema";
import { createAdminGuard } from "@/lib/middleware";
import { handleApiError } from "@/lib/errors";
import { findMediaReferences } from "@/lib/media-references";

export async function GET(req: NextRequest) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;

    const { searchParams } = req.nextUrl;
    const search = searchParams.get("search")?.trim();
    const folder = searchParams.get("folder")?.trim();
    const type = searchParams.get("type")?.trim();
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(60, parseInt(searchParams.get("limit") ?? "24"));
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [];
    if (folder) conditions.push(eq(media.folder, folder));
    if (type === "image" || type === "video") {
      conditions.push(sql`${media.mimeType} like ${`${type}/%`}`);
    }
    if (search) {
      const searchClause = orSearch(search);
      if (searchClause) conditions.push(searchClause);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, countRows, folderRows] = await Promise.all([
      db
        .select()
        .from(media)
        .where(whereClause)
        .orderBy(desc(media.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(media).where(whereClause),
      db
        .select({
          folder: media.folder,
          count: sql<number>`count(*)`,
        })
        .from(media)
        .groupBy(media.folder)
        .orderBy(media.folder),
    ]);

    const withReferences = await Promise.all(rows.map(async (row) => {
      const references = await findMediaReferences(row.url);
      return { ...row, referenceCount: references.length, references };
    }));

    const total = Number(countRows[0]?.count ?? 0);
    return NextResponse.json({
      success: true,
      data: withReferences,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      filters: {
        folders: folderRows.map((row) => ({ folder: row.folder, count: Number(row.count ?? 0) })),
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

function orSearch(search: string): SQL | undefined {
  return sql`(
    ${media.originalName} ilike ${`%${search}%`} or
    ${media.filename} ilike ${`%${search}%`} or
    ${media.alt} ilike ${`%${search}%`} or
    ${media.folder} ilike ${`%${search}%`}
  )`;
}
