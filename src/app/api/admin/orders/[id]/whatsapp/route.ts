import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { createAdminGuard, getAuthPayload } from "@/lib/middleware";
import { handleApiError, NotFoundError, ValidationError } from "@/lib/errors";
import { requireModuleApi } from "@/lib/modules";
import {
  getWhatsAppConfig,
  renderWhatsAppTemplate,
  sendWhatsAppAndLog,
  WHATSAPP_TEMPLATE_KEYS,
  type WhatsAppTemplateKey,
} from "@/lib/whatsapp";

const ORDER_TEMPLATE_KEYS = ["order_confirmed", "order_shipped", "payment_rejected"] as const;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;
    const moduleResult = await requireModuleApi("ecommerce");
    if (moduleResult) return moduleResult;

    const payload = await getAuthPayload(req);
    const { id } = await params;
    const body = await req.json() as { templateKey?: WhatsAppTemplateKey; reason?: string };
    const templateKey = body.templateKey ?? "order_confirmed";

    if (!WHATSAPP_TEMPLATE_KEYS.includes(templateKey) || !ORDER_TEMPLATE_KEYS.includes(templateKey as typeof ORDER_TEMPLATE_KEYS[number])) {
      throw new ValidationError("Unsupported order WhatsApp template");
    }

    const rows = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    const order = rows[0];
    if (!order) throw new NotFoundError("Order");

    const phone = order.guestPhone;
    if (!phone) throw new ValidationError("Order has no customer phone number");

    const customerName = order.guestName ?? "Customer";
    const config = await getWhatsAppConfig();
    const message = renderWhatsAppTemplate(config.templates[templateKey], {
      customerName,
      orderNumber: order.orderNumber,
      trackingLine: order.trackingNumber ? `\nTracking: ${order.trackingNumber} (${order.courier ?? "Courier"})` : "",
      deliveryLine: order.estimatedDelivery ? `\nExpected: ${order.estimatedDelivery}` : "",
      reasonLine: body.reason ? `\nReason: ${body.reason}` : "",
    });

    const result = await sendWhatsAppAndLog({
      to: phone,
      recipientName: customerName,
      orderId: order.id,
      message,
      templateKey,
      sentBy: payload?.sub ?? null,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    return handleApiError(err);
  }
}
