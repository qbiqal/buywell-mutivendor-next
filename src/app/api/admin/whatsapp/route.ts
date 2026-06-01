import { NextRequest, NextResponse } from "next/server";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders, whatsappLogs } from "@/lib/db/schema";
import { createAdminGuard, getAuthPayload } from "@/lib/middleware";
import { handleApiError, ValidationError } from "@/lib/errors";
import { setSiteConfig } from "@/lib/config";
import {
  getWhatsAppConfig,
  renderWhatsAppTemplate,
  sendWhatsAppAndLog,
  WHATSAPP_TEMPLATE_KEYS,
  type WhatsAppTemplateKey,
} from "@/lib/whatsapp";

export async function GET(req: NextRequest) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;

    const { searchParams } = req.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20"));
    const offset = (page - 1) * limit;

    const [config, rows, countRows] = await Promise.all([
      getWhatsAppConfig(),
      db
        .select({
          id: whatsappLogs.id,
          orderId: whatsappLogs.orderId,
          orderNumber: orders.orderNumber,
          templateKey: whatsappLogs.templateKey,
          recipientPhone: whatsappLogs.recipientPhone,
          recipientName: whatsappLogs.recipientName,
          message: whatsappLogs.message,
          status: whatsappLogs.status,
          providerMessageId: whatsappLogs.providerMessageId,
          error: whatsappLogs.error,
          sentBy: whatsappLogs.sentBy,
          createdAt: whatsappLogs.createdAt,
        })
        .from(whatsappLogs)
        .leftJoin(orders, eq(orders.id, whatsappLogs.orderId))
        .orderBy(desc(whatsappLogs.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(whatsappLogs),
    ]);

    const total = Number(countRows[0]?.count ?? 0);
    return NextResponse.json({
      success: true,
      data: {
        config,
        logs: rows,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
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

    const body = await req.json() as Record<string, string>;
    const allowedKeys = new Set([
      "whatsapp_enabled",
      "whatsapp_order_notify",
      "whatsapp_admin_number",
      ...WHATSAPP_TEMPLATE_KEYS.map((key) => `whatsapp_template_${key}`),
    ]);

    for (const [key, value] of Object.entries(body)) {
      if (!allowedKeys.has(key)) throw new ValidationError(`Unsupported WhatsApp setting: ${key}`);
      await setSiteConfig(key, value ?? "", "whatsapp");
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;
    const payload = await getAuthPayload(req);

    const body = await req.json() as {
      phone?: string;
      customerName?: string;
      message?: string;
      templateKey?: WhatsAppTemplateKey;
    };

    if (!body.phone || !body.message) {
      throw new ValidationError("phone and message are required");
    }

    const config = await getWhatsAppConfig();
    const templateKey = body.templateKey && WHATSAPP_TEMPLATE_KEYS.includes(body.templateKey)
      ? body.templateKey
      : "manual";
    const message = templateKey === "manual"
      ? renderWhatsAppTemplate(config.templates.manual, {
          customerName: body.customerName ?? "Customer",
          message: body.message,
        })
      : renderWhatsAppTemplate(config.templates[templateKey], {
          customerName: body.customerName ?? "Customer",
          message: body.message,
        });

    const result = await sendWhatsAppAndLog({
      to: body.phone,
      recipientName: body.customerName ?? null,
      message,
      templateKey,
      sentBy: payload?.sub ?? null,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    return handleApiError(err);
  }
}
