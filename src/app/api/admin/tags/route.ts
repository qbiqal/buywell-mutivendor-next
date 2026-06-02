import { NextRequest, NextResponse } from "next/server";
import { asc, eq, ilike, or } from "drizzle-orm";
import slugify from "slugify";
import { db } from "@/lib/db";
import { contentTags } from "@/lib/db/schema";
import { handleApiError, ValidationError } from "@/lib/errors";
import { createAdminGuard } from "@/lib/middleware";

const MODULES = new Set(["blog", "product", "cms", "seo"]);

export async function GET(req: NextRequest) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;

    const moduleKey = normalizeModule(req.nextUrl.searchParams.get("module"));
    const search = req.nextUrl.searchParams.get("search")?.trim() ?? "";
    const where = search
      ? or(eq(contentTags.moduleKey, moduleKey), ilike(contentTags.name, `%${search}%`))
      : eq(contentTags.moduleKey, moduleKey);
    const rows = await db.select().from(contentTags).where(where).orderBy(asc(contentTags.name)).limit(80);
    return NextResponse.json({ success: true, data: rows.filter((row) => row.moduleKey === moduleKey) });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;

    const body = await req.json();
    const moduleKey = normalizeModule(body.moduleKey ?? body.module);
    const name = String(body.name ?? "").trim();
    if (!name) throw new ValidationError("Tag name is required");
    const slug = `${moduleKey}-${slugify(String(body.slug || name), { lower: true, strict: true })}`.slice(0, 120);
    const [existing] = await db.select().from(contentTags).where(eq(contentTags.slug, slug)).limit(1);
    if (existing) return NextResponse.json({ success: true, data: existing });

    const [row] = await db.insert(contentTags).values({
      name,
      slug,
      moduleKey,
      color: String(body.color || colorForName(name)),
    }).returning();
    return NextResponse.json({ success: true, data: row }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

function normalizeModule(value: unknown): string {
  const moduleKey = String(value ?? "blog");
  return MODULES.has(moduleKey) ? moduleKey : "blog";
}

function colorForName(value: string): string {
  const colors = ["#D97706", "#16A34A", "#2563EB", "#C026D3", "#DC2626", "#0891B2"];
  const sum = Array.from(value).reduce((total, char) => total + char.charCodeAt(0), 0);
  return colors[sum % colors.length];
}
