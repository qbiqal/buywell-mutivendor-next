import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, orderStatusHistory } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { handleApiError, NotFoundError, ValidationError } from "@/lib/errors";
import { notifyAdminNewOrder } from "@/lib/whatsapp";
import { requireModuleApi } from "@/lib/modules";
import { getAllSiteConfig } from "@/lib/config";
import { getPaymentGateway, type GatewayName } from "@/lib/payment";
import { verifyPaymentProofUploadToken } from "@/lib/upload-token";

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const moduleResult = await requireModuleApi("ecommerce");
    if (moduleResult) return moduleResult;

    const { id } = await params;

    // Verify order exists
    const rows = await db.select().from(orders).where(eq(orders.id, id));
    if (!rows[0]) throw new NotFoundError("Order");
    const order = rows[0];

    const formData = await req.formData();
    const file = formData.get("proof") as File | null;
    const token = String(formData.get("token") ?? req.headers.get("x-upload-token") ?? "");

    if (!verifyPaymentProofUploadToken(token, id)) {
      throw new ValidationError("Payment proof upload link has expired. Please place the order again or contact support.");
    }
    if (!file) throw new ValidationError("Payment proof file is required");
    if (file.size > MAX_SIZE_BYTES) throw new ValidationError("File too large — max 5MB");
    if (!file.type.startsWith("image/")) throw new ValidationError("Only image files are accepted");

    // Save file — local in dev, R2 in prod
    let proofUrl: string;

    const mediaConfig = await getAllSiteConfig("media");
    const useR2 = mediaConfig.media_storage === "r2" || (process.env.NODE_ENV === "production" && Boolean(process.env.CLOUDFLARE_R2_BUCKET_NAME));

    if (useR2) {
      // R2 upload
      const { uploadToR2 } = await import("@/lib/media");
      const buffer = Buffer.from(await file.arrayBuffer());
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      proofUrl = await uploadToR2(`payment-proofs/${order.orderNumber}-${Date.now()}.${extension}`, buffer, file.type);
    } else {
      // Local save (dev only)
      const { writeFile, mkdir } = await import("fs/promises");
      const { join } = await import("path");
      const dir = join(process.cwd(), "public", "uploads", "proofs");
      await mkdir(dir, { recursive: true });
      const filename = `${order.orderNumber}-${Date.now()}.jpg`;
      const bytes = await file.arrayBuffer();
      await writeFile(join(dir, filename), Buffer.from(bytes));
      proofUrl = `/uploads/proofs/${filename}`;
    }

    const gateway = await getPaymentGateway(order.paymentGateway as GatewayName);
    const verification = await gateway.verifyPayment({ orderId: id, proofUrl });

    // Update order
    await db.update(orders)
      .set({
        paymentProofUrl:          proofUrl,
        paymentProofOriginalName: file.name,
        paymentStatus:            verification.verified ? "verified" : "uploaded",
        status:                   verification.verified ? "payment_verified" : "payment_uploaded",
        paymentRef:               verification.transactionRef ?? order.paymentRef,
        updatedAt:                new Date(),
      })
      .where(eq(orders.id, id));

    await db.insert(orderStatusHistory).values({
      orderId:   id,
      status:    verification.verified ? "payment_verified" : "payment_uploaded",
      note:      verification.verified ? "Payment verified by gateway" : "Customer uploaded payment proof",
      changedBy: "system",
    });

    // WhatsApp admin alert
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    notifyAdminNewOrder({
      orderNumber:    order.orderNumber,
      customerName:   order.guestName ?? "Customer",
      customerPhone:  order.guestPhone ?? "",
      items:          "Payment proof uploaded",
      totalFormatted: `₹${((order.totalInr) / 100).toLocaleString("en-IN")}`,
      orderUrl:       `${appUrl}/admin/orders/${id}`,
    }).catch(() => {});

    return NextResponse.json({ success: true, data: { proofUrl } });
  } catch (err) {
    return handleApiError(err);
  }
}
