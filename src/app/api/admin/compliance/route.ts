import { NextRequest, NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { cmsPages, complianceChecks } from "@/lib/db/schema";
import { handleApiError, NotFoundError, ValidationError } from "@/lib/errors";
import { createAdminGuard } from "@/lib/middleware";
import { getModuleState, type ModuleKey } from "@/lib/modules";

const STATUSES = new Set(["fulfilled", "partial", "missing", "not_applicable"]);

export async function GET(req: NextRequest) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;

    const modules = await getModuleState();
    const compliance = req.nextUrl.searchParams.get("compliance") ?? "";
    const checks = await db.select().from(complianceChecks)
      .where(compliance ? eq(complianceChecks.complianceKey, compliance) : undefined)
      .orderBy(asc(complianceChecks.complianceKey), asc(complianceChecks.moduleKey), asc(complianceChecks.title));
    const pages = await db.select({
      id: cmsPages.id,
      title: cmsPages.title,
      slug: cmsPages.slug,
      moduleKey: cmsPages.moduleKey,
      policyType: cmsPages.policyType,
      status: cmsPages.status,
    }).from(cmsPages).orderBy(asc(cmsPages.title));

    return NextResponse.json({
      success: true,
      data: {
        checks: checks.filter((check) => check.moduleKey === "core" || modules[check.moduleKey as ModuleKey]),
        policies: pages.filter((page) => page.moduleKey === "core" || modules[page.moduleKey as ModuleKey]),
        modules,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;

    const body = await req.json();
    const id = String(body.id ?? "");
    const status = String(body.status ?? "");
    if (!id) throw new ValidationError("Compliance check id is required");
    if (!STATUSES.has(status)) throw new ValidationError("Invalid compliance status");

    const [row] = await db.update(complianceChecks).set({
      status,
      evidence: body.evidence !== undefined ? nullableText(body.evidence) : undefined,
      updatedAt: new Date(),
    }).where(eq(complianceChecks.id, id)).returning();
    if (!row) throw new NotFoundError("Compliance check");
    return NextResponse.json({ success: true, data: row });
  } catch (err) {
    return handleApiError(err);
  }
}

function nullableText(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text ? text : null;
}
