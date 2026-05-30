import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, orderStatusHistory } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { handleApiError, NotFoundError, ValidationError } from "@/lib/errors";
import { notifyAdminNewOrder } from "@/lib/whatsapp";

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify order exists
    const rows = await db.select().from(orders).where(eq(orders.id, id));
    if (!rows[0]) throw new NotFoundError("Order");
    const order = rows[0];

    const formData = await req.formData();
    const file = formData.get("proof") as File | null;

    if (!file) throw new ValidationError("Payment proof file is required");
    if (file.size > MAX_SIZE_BYTES) throw new ValidationError("File too large — max 5MB");
    if (!file.type.startsWith("image/")) throw new ValidationError("Only image files are accepted");

    // Save file — local in dev, R2 in prod
    let proofUrl: string;

    if (process.env.NODE_ENV === "production" && process.env.CLOUDFLARE_R2_BUCKET_NAME) {
      // R2 upload
      const { uploadToR2 } = await import("@/lib/media");
      const buffer = Buffer.from(await file.arrayBuffer());
      proofUrl = await uploadToR2(`payment-proofs/${order.orderNumber}-${Date.now()}`, buffer, file.type);
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

    // Update order
    await db.update(orders)
      .set({
        paymentProofUrl:          proofUrl,
        paymentProofOriginalName: file.name,
        paymentStatus:            "uploaded",
        status:                   "payment_uploaded",
        updatedAt:                new Date(),
      })
      .where(eq(orders.id, id));

    await db.insert(orderStatusHistory).values({
      orderId:   id,
      status:    "payment_uploaded",
      note:      "Customer uploaded payment proof",
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
