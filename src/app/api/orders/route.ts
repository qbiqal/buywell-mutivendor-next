import { NextRequest, NextResponse } from "next/server";
import { db, pool } from "@/lib/db";
import { orders, orderItems, orderStatusHistory, addresses, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getAuthPayload } from "@/lib/middleware";
import { handleApiError, ValidationError } from "@/lib/errors";
import { generateOrderNumber } from "@/lib/order-number";
import { getShippingConfig } from "@/lib/config";
import { notifyAdminNewOrder } from "@/lib/whatsapp";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      items,          // CartItem[]
      address,        // { name, phone, line1, line2, city, state, pincode }
      notes,
      isSampleRequest = false,
    } = body;

    if (!items?.length && !isSampleRequest) {
      throw new ValidationError("Cart is empty");
    }
    if (!address?.name || !address?.phone || !address?.city) {
      throw new ValidationError("Delivery address is required");
    }

    // Auth — optional (guest checkout allowed)
    const payload = await getAuthPayload(req);
    let userId: string | undefined;
    let guestName = address.name;
    let guestPhone = address.phone;
    let guestEmail: string | undefined;

    if (payload) {
      userId = payload.sub;
      const userRows = await db.select({ email: users.email }).from(users).where(eq(users.id, userId));
      guestEmail = userRows[0]?.email;
    }

    // Calculate totals
    const subtotalInr = isSampleRequest ? 0 :
      items.reduce((sum: number, i: { unitPriceInr: number; quantity: number }) => sum + i.unitPriceInr * i.quantity, 0);

    const { freeAbovePaise, flatRatePaise, freeEnabled } = await getShippingConfig();
    const shippingInr = (isSampleRequest || (freeEnabled && subtotalInr >= freeAbovePaise)) ? 0 : flatRatePaise;
    const totalInr = subtotalInr + shippingInr;

    const orderNumber = await generateOrderNumber();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

    // Create order in transaction
    const client = await pool.connect();
    let newOrderId: string;
    try {
      await client.query("BEGIN");

      // Insert order
      const [order] = await db.insert(orders).values({
        orderNumber,
        userId:         userId ?? null,
        guestName:      !userId ? guestName : null,
        guestEmail:     !userId ? guestEmail : null,
        guestPhone:     !userId ? guestPhone : null,
        status:         "pending",
        paymentStatus:  "pending",
        paymentGateway: "offline_qr",
        subtotalInr,
        shippingInr,
        discountInr:    0,
        totalInr,
        addressSnapshot: address,
        notes:           notes ?? null,
        isSampleRequest,
      }).returning();

      newOrderId = order.id;

      // Insert order items (skip for sample requests)
      if (!isSampleRequest && items?.length) {
        await db.insert(orderItems).values(
          items.map((i: {
            variantId: string;
            productName: string;
            variantName: string;
            imageUrl?: string;
            unitPriceInr: number;
            quantity: number;
          }) => ({
            orderId:        order.id,
            variantId:      i.variantId,
            productSnapshot: {
              productName: i.productName,
              variantName: i.variantName,
              imageUrl:    i.imageUrl,
            },
            quantity:       i.quantity,
            unitPriceInr:   i.unitPriceInr,
            totalInr:       i.unitPriceInr * i.quantity,
          }))
        );
      }

      // Initial status history
      await db.insert(orderStatusHistory).values({
        orderId:   order.id,
        status:    "pending",
        note:      isSampleRequest ? "Sample request submitted" : "Order placed",
        changedBy: "system",
      });

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    // WhatsApp admin notification (non-fatal)
    notifyAdminNewOrder({
      orderNumber,
      customerName:  address.name,
      customerPhone: address.phone,
      items:         isSampleRequest ? "Free Sample Request" : items
        .map((i: { productName: string; variantName: string; quantity: number }) => `${i.productName} ${i.variantName} ×${i.quantity}`)
        .join(", "),
      totalFormatted: isSampleRequest ? "FREE" : `₹${(totalInr / 100).toLocaleString("en-IN")}`,
      orderUrl: `${appUrl}/admin/orders/${newOrderId!}`,
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      data: {
        orderId:     newOrderId!,
        orderNumber,
        totalInr,
        shippingInr,
      },
    }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
