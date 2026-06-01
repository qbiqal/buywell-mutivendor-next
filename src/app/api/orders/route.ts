import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, orderItems, orderStatusHistory, productVariants, products, users } from "@/lib/db/schema";
import { and, eq, gte, sql } from "drizzle-orm";
import { getAuthPayload } from "@/lib/middleware";
import { handleApiError, ValidationError } from "@/lib/errors";
import { generateOrderNumber } from "@/lib/order-number";
import { getShippingConfig } from "@/lib/config";
import { notifyAdminNewOrder } from "@/lib/whatsapp";
import { requireModuleApi } from "@/lib/modules";
import { getPaymentGateway } from "@/lib/payment";
import { createPaymentProofUploadToken } from "@/lib/upload-token";

interface IncomingOrderItem {
  variantId: string;
  productName?: string;
  variantName?: string;
  imageUrl?: string;
  unitPriceInr?: number;
  quantity: number;
}

export async function POST(req: NextRequest) {
  try {
    const moduleResult = await requireModuleApi("ecommerce");
    if (moduleResult) return moduleResult;

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

    const requestedItems = (items ?? []) as IncomingOrderItem[];
    for (const item of requestedItems) {
      if (!item.variantId || !Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new ValidationError("Invalid cart item");
      }
    }

    const orderNumber = await generateOrderNumber();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    const shippingConfig = await getShippingConfig();
    const paymentGateway = await getPaymentGateway();

    let newOrderId: string;
    let subtotalInr = 0;
    let shippingInr = 0;
    let totalInr = 0;
    let itemSummary = "Free Sample Request";
    let paymentSession = null as Awaited<ReturnType<typeof paymentGateway.createSession>> | null;

    await db.transaction(async (tx) => {
      const preparedItems: Array<{
        variantId: string;
        productName: string;
        variantName: string;
        imageUrl?: string;
        unitPriceInr: number;
        quantity: number;
      }> = [];

      if (!isSampleRequest) {
        for (const item of requestedItems) {
          const [row] = await tx
            .select({
              variantId: productVariants.id,
              variantName: productVariants.name,
              priceInr: productVariants.priceInr,
              stock: productVariants.stock,
              productName: products.name,
              productActive: products.isActive,
            })
            .from(productVariants)
            .innerJoin(products, eq(products.id, productVariants.productId))
            .where(and(
              eq(productVariants.id, item.variantId),
              eq(productVariants.isActive, true),
              eq(products.isActive, true),
            ))
            .limit(1);

          if (!row) throw new ValidationError("One or more cart items are unavailable");
          if (row.stock < item.quantity) {
            throw new ValidationError(`${row.productName} ${row.variantName} has only ${row.stock} left in stock`);
          }

          const [updated] = await tx.update(productVariants)
            .set({ stock: sql`${productVariants.stock} - ${item.quantity}` })
            .where(and(eq(productVariants.id, item.variantId), gte(productVariants.stock, item.quantity)))
            .returning({ id: productVariants.id });
          if (!updated) throw new ValidationError(`${row.productName} ${row.variantName} went out of stock`);

          preparedItems.push({
            variantId: row.variantId,
            productName: row.productName,
            variantName: row.variantName,
            imageUrl: item.imageUrl,
            unitPriceInr: row.priceInr,
            quantity: item.quantity,
          });
          subtotalInr += row.priceInr * item.quantity;
        }
      }

      shippingInr = (isSampleRequest || (shippingConfig.freeEnabled && subtotalInr >= shippingConfig.freeAbovePaise))
        ? 0
        : shippingConfig.flatRatePaise;
      totalInr = subtotalInr + shippingInr;
      itemSummary = isSampleRequest
        ? "Free Sample Request"
        : preparedItems.map((i) => `${i.productName} ${i.variantName} ×${i.quantity}`).join(", ");

      const [order] = await tx.insert(orders).values({
        orderNumber,
        userId:         userId ?? null,
        guestName:      !userId ? guestName : null,
        guestEmail:     !userId ? guestEmail : null,
        guestPhone:     !userId ? guestPhone : null,
        status:         "pending",
        paymentStatus:  "pending",
        paymentGateway: paymentGateway.name,
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
      if (!isSampleRequest && preparedItems.length) {
        await tx.insert(orderItems).values(
          preparedItems.map((i) => ({
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
      await tx.insert(orderStatusHistory).values({
        orderId:   order.id,
        status:    "pending",
        note:      isSampleRequest ? "Sample request submitted" : "Order placed",
        changedBy: "system",
      });

      paymentSession = await paymentGateway.createSession({
        orderId: order.id,
        amount: totalInr,
        currency: "INR",
        customerName: address.name,
        customerPhone: address.phone,
        metadata: { orderNumber },
      });
    });

    // WhatsApp admin notification (non-fatal)
    notifyAdminNewOrder({
      orderNumber,
      customerName:  address.name,
      customerPhone: address.phone,
      items:         itemSummary,
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
        paymentGateway: paymentGateway.name,
        paymentSession,
        uploadToken: createPaymentProofUploadToken(newOrderId!),
      },
    }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
