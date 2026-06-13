/**
 * Razorpay Payment Gateway
 *
 * Flow:
 * 1. createSession → creates Razorpay order via REST API, returns order_id
 * 2. Checkout UI renders Razorpay checkout.js with the order_id
 * 3. Customer pays, Razorpay calls webhook or FE passes razorpay_payment_id
 * 4. verifyPayment → verifies HMAC signature from webhook payload
 */

import type { PaymentGateway, PaymentSession, PaymentVerifyResult } from "./types";
import { getSiteConfig } from "../config";

async function getRazorpayKeys(): Promise<{ keyId: string; keySecret: string } | null> {
  const [keyId, keySecret] = await Promise.all([
    getSiteConfig("payment_razorpay_key_id"),
    getSiteConfig("payment_razorpay_key_secret"),
  ]);
  if (!keyId || !keySecret) return null;
  return { keyId, keySecret };
}

async function razorpayPost(endpoint: string, body: object, keyId: string, keySecret: string) {
  const credentials = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const res = await fetch(`https://api.razorpay.com/v1${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Basic ${credentials}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Razorpay API error ${res.status}: ${err}`);
  }
  return res.json();
}

export const razorpayGateway: PaymentGateway = {
  name: "razorpay",
  displayName: "Pay via Razorpay (UPI / Card / NetBanking)",

  async isEnabled(): Promise<boolean> {
    const enabled = await getSiteConfig("payment_razorpay_enabled");
    if (enabled === "false") return false;
    const keys = await getRazorpayKeys();
    return keys !== null;
  },

  async createSession({ orderId, amount, customerName, customerPhone, metadata = {} }): Promise<PaymentSession> {
    const keys = await getRazorpayKeys();
    if (!keys) throw new Error("Razorpay keys not configured");

    const rzpOrder = await razorpayPost("/orders", {
      amount,         // paise
      currency: "INR",
      receipt: orderId,
      notes: { orderId, customerName: customerName ?? "", ...metadata },
    }, keys.keyId, keys.keySecret);

    return {
      gatewayName: "razorpay",
      sessionId: rzpOrder.id,  // razorpay order_id e.g. "order_XXXXX"
      amount,
      currency: "INR",
      metadata: {
        razorpayOrderId: rzpOrder.id,
        keyId: keys.keyId,
        customerName: customerName ?? "",
        customerPhone: customerPhone ?? "",
        ...metadata,
      },
    };
  },

  async verifyPayment({ orderId, sessionId, transactionRef, webhookPayload }): Promise<PaymentVerifyResult> {
    const keys = await getRazorpayKeys();
    if (!keys) return { verified: false, error: "Razorpay keys not configured" };

    try {
      // Webhook signature verification
      if (webhookPayload && typeof webhookPayload === "object") {
        const payload = webhookPayload as Record<string, unknown>;
        const webhookSecret = await getSiteConfig("payment_razorpay_webhook_secret");

        if (webhookSecret) {
          const crypto = await import("crypto");
          const body = payload.__rawBody as string | undefined;
          const receivedSig = payload.__signature as string | undefined;
          if (body && receivedSig) {
            const expectedSig = crypto.createHmac("sha256", webhookSecret).update(body).digest("hex");
            if (expectedSig !== receivedSig) {
              return { verified: false, error: "Webhook signature mismatch" };
            }
          }
        }

        // Extract payment details from webhook event
        const event = payload.event as string | undefined;
        if (event === "payment.captured") {
          const paymentEntity = ((payload.payload as Record<string, Record<string, unknown>>)?.payment?.entity) as Record<string, unknown> | undefined;
          return {
            verified: true,
            transactionRef: paymentEntity?.id as string | undefined,
            paidAmount: paymentEntity?.amount as number | undefined,
          };
        }
        return { verified: false, error: `Unhandled event: ${event}` };
      }

      // Manual verification: fetch payment from Razorpay and check status
      if (transactionRef) {
        const credentials = Buffer.from(`${keys.keyId}:${keys.keySecret}`).toString("base64");
        const res = await fetch(`https://api.razorpay.com/v1/payments/${transactionRef}`, {
          headers: { "Authorization": `Basic ${credentials}` },
        });
        if (!res.ok) return { verified: false, error: "Could not fetch payment from Razorpay" };
        const payment = await res.json();
        if (payment.status === "captured" && payment.order_id === sessionId) {
          return { verified: true, transactionRef, paidAmount: payment.amount };
        }
        return { verified: false, error: `Payment status: ${payment.status}` };
      }

      return { verified: false, error: "No transaction reference or webhook payload provided" };
    } catch (err) {
      return { verified: false, error: String(err) };
    }
  },
};
