import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { addresses } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { createAuthGuard, getAuthPayload } from "@/lib/middleware";
import { handleApiError, ValidationError } from "@/lib/errors";
import { requireModuleApi } from "@/lib/modules";

export async function GET(req: NextRequest) {
  try {
    const authResult = await createAuthGuard()(req);
    if (authResult) return authResult;
    const payload = await getAuthPayload(req);
    if (!payload) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const rows = await db.select().from(addresses)
      .where(eq(addresses.userId, payload.sub))
      .orderBy(desc(addresses.isDefault));

    return NextResponse.json({ success: true, data: rows });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await createAuthGuard()(req);
    if (authResult) return authResult;
    const moduleResult = await requireModuleApi("ecommerce");
    if (moduleResult) return moduleResult;

    const payload = await getAuthPayload(req);
    if (!payload) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { label, name, phone, line1, line2, city, state, pincode, isDefault } = body;

    if (!name || !phone || !line1 || !city || !state || !pincode) {
      throw new ValidationError("name, phone, line1, city, state, pincode are required");
    }

    // If setting as default, unset others
    if (isDefault) {
      await db.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, payload.sub));
    }

    const id = crypto.randomUUID();
    await db.insert(addresses).values({
      id, userId: payload.sub,
      label: label || null, name, phone,
      line1, line2: line2 || null, city, state, pincode,
      isDefault: isDefault ?? false,
    });

    const rows = await db.select().from(addresses).where(eq(addresses.id, id));
    return NextResponse.json({ success: true, data: rows[0] }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authResult = await createAuthGuard()(req);
    if (authResult) return authResult;
    const moduleResult = await requireModuleApi("ecommerce");
    if (moduleResult) return moduleResult;

    const payload = await getAuthPayload(req);
    if (!payload) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { searchParams } = req.nextUrl;
    const id = searchParams.get("id");
    if (!id) throw new ValidationError("id is required");

    await db.delete(addresses).where(and(eq(addresses.id, id), eq(addresses.userId, payload.sub)));
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
