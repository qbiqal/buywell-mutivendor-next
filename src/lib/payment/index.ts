/**
 * Payment Gateway Registry
 * To add a new gateway:
 *   1. Implement PaymentGateway in a new file (e.g. razorpay.ts)
 *   2. Register it in GATEWAYS below
 *   3. Set payment_default_gateway in site_config or enable in admin panel
 */

import type { PaymentGateway } from "./types";
import { offlineQrGateway } from "./offline-qr";
import { getSiteConfig } from "../config";

export type GatewayName = "offline_qr" | "razorpay" | "stripe";

const GATEWAYS: Record<string, PaymentGateway> = {
  offline_qr: offlineQrGateway,
  // razorpay: razorpayGateway,   ← add later
  // stripe:   stripeGateway,     ← add later
};

export async function getPaymentGateway(name?: GatewayName): Promise<PaymentGateway> {
  const gatewayName = name ?? ((await getSiteConfig("payment_default_gateway")) as GatewayName) ?? "offline_qr";
  const gateway = GATEWAYS[gatewayName];

  if (!gateway) {
    console.warn(`[payment] Unknown gateway "${gatewayName}", falling back to offline_qr`);
    return offlineQrGateway;
  }

  const enabled = await gateway.isEnabled();
  if (!enabled) {
    console.warn(`[payment] Gateway "${gatewayName}" is disabled, falling back to offline_qr`);
    return offlineQrGateway;
  }

  return gateway;
}

export function getAvailableGateways(): PaymentGateway[] {
  return Object.values(GATEWAYS);
}

export type { PaymentGateway, PaymentSession, PaymentVerifyResult } from "./types";
