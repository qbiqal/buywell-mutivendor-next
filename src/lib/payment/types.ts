/**
 * Payment Gateway Abstraction
 * Add new gateways by implementing PaymentGateway and registering in index.ts.
 */

export interface PaymentSession {
  gatewayName: string;
  sessionId?: string;
  amount: number;           // in paise
  currency: "INR";
  metadata: Record<string, string>;
}

export interface PaymentVerifyResult {
  verified: boolean;
  transactionRef?: string;
  paidAmount?: number;
  error?: string;
}

export interface PaymentGateway {
  name: string;             // "offline_qr" | "razorpay" | "stripe"
  displayName: string;      // "Pay via UPI / QR"
  isEnabled: () => Promise<boolean>;

  // Create a payment session / intent for this order
  createSession(params: {
    orderId: string;
    amount: number;  // paise
    currency: "INR";
    customerName?: string;
    customerPhone?: string;
    metadata?: Record<string, string>;
  }): Promise<PaymentSession>;

  // Verify payment (called after customer completes payment)
  verifyPayment(params: {
    orderId: string;
    sessionId?: string;
    proofUrl?: string;      // for offline QR — uploaded screenshot URL
    transactionRef?: string;// for Razorpay/Stripe
    webhookPayload?: unknown;
  }): Promise<PaymentVerifyResult>;
}
