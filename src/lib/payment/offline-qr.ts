/**
 * Offline QR Payment Gateway
 *
 * Flow:
 * 1. createSession → returns QR URL from site_config
 * 2. Customer scans QR, pays, uploads screenshot
 * 3. Admin manually verifies via admin panel
 * 4. verifyPayment → always returns pending (admin triggers via dashboard)
 */

import type { PaymentGateway, PaymentSession, PaymentVerifyResult } from "./types";
import { getSiteConfig } from "../config";

export const offlineQrGateway: PaymentGateway = {
  name: "offline_qr",
  displayName: "Pay via UPI / QR Code",

  async isEnabled(): Promise<boolean> {
    const enabled = await getSiteConfig("payment_offline_qr_enabled");
    return enabled !== "false";
  },

  async createSession({ orderId, amount }): Promise<PaymentSession> {
    const qrUrl = (await getSiteConfig("payment_qr_url")) ?? "";
    const upiId = (await getSiteConfig("payment_upi_id")) ?? "";
    const companyName = (await getSiteConfig("payment_company_name")) ?? "APRAS Naturals";

    return {
      gatewayName: "offline_qr",
      sessionId: `qr_${orderId}_${Date.now()}`,
      amount,
      currency: "INR",
      metadata: {
        qrUrl,
        upiId,
        companyName,
        instructions: `Scan the QR code or pay to UPI ID: ${upiId}. Then upload your payment screenshot.`,
      },
    };
  },

  async verifyPayment({ proofUrl }): Promise<PaymentVerifyResult> {
    // Offline QR: proof is submitted but admin verifies manually
    // Return verified=false with no error — order stays in payment_uploaded status
    if (!proofUrl) {
      return { verified: false, error: "Payment proof screenshot is required." };
    }
    // Proof received — admin will verify via dashboard
    return { verified: false }; // admin must call PATCH /api/admin/orders/:id/verify-payment
  },
};
