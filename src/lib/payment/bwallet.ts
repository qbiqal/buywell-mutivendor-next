import { getSiteConfig } from '@/lib/config';
import type { PaymentGateway, PaymentSession, PaymentVerifyResult } from './types';

const GATEWAY_KEY = 'bwallet' as const;

export const bwalletGateway = {
  key: GATEWAY_KEY,
  name: 'BuyWell Wallet',

  async isEnabled(): Promise<boolean> {
    return (await getSiteConfig('payment_bwallet_enabled')) === 'true';
  },

  async getBalance(bwUserId: number): Promise<number> {
    // Returns balance in paise. Throws if API unavailable.
    const apiUrl = await getSiteConfig('payment_bwallet_api_url');
    const apiKey = await getSiteConfig('payment_bwallet_api_key');

    if (!apiUrl || !apiKey) {
      throw new Error('BuyWell Global API configuration missing');
    }

    const res = await fetch(`${apiUrl}/api/marketplace/wallet/balance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Marketplace-Key': apiKey,
      },
      body: JSON.stringify({ identifier: String(bwUserId), identifier_type: 'bw_user_id' }),
      signal: AbortSignal.timeout(5000),  // 5s timeout
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Unknown API error' }));
      throw new Error(`BuyWell Global API error: ${err.error || res.status}`);
    }
    
    const json = await res.json();
    return json.data.ecommerce_balance; // paise
  },

  async debit(params: {
    bwUserId: number;
    amount: number;           // paise
    orderId: string;
    idempotencyKey: string;
  }): Promise<{ transactionId: string }> {
    const apiUrl = await getSiteConfig('payment_bwallet_api_url');
    const apiKey = await getSiteConfig('payment_bwallet_api_key');

    if (!apiUrl || !apiKey) {
      throw new Error('BuyWell Global API configuration missing');
    }

    const res = await fetch(`${apiUrl}/api/marketplace/wallet/debit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Marketplace-Key': apiKey,
      },
      body: JSON.stringify({
        bw_user_id: params.bwUserId,
        amount: params.amount,
        currency: 'INR',
        reference: params.orderId,
        description: `BuyWell Marketplace Order #${params.orderId}`,
        idempotency_key: params.idempotencyKey,
      }),
      signal: AbortSignal.timeout(10000),
    });

    const json = await res.json();
    if (!json.success) {
      throw Object.assign(new Error(json.error || 'Debit failed'), { code: json.error, data: json.data });
    }
    return { transactionId: json.data.transaction_id };
  },

  async reverse(transactionId: string, reason: string): Promise<void> {
    const apiUrl = await getSiteConfig('payment_bwallet_api_url');
    const apiKey = await getSiteConfig('payment_bwallet_api_key');

    if (!apiUrl || !apiKey) return;

    await fetch(`${apiUrl}/api/marketplace/wallet/reverse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Marketplace-Key': apiKey || '',
      },
      body: JSON.stringify({ transaction_id: transactionId, reason }),
      signal: AbortSignal.timeout(10000),
    });
  },

  async lookupUser(identifier: string, type: 'phone' | 'email') {
    const apiUrl = await getSiteConfig('payment_bwallet_api_url');
    const apiKey = await getSiteConfig('payment_bwallet_api_key');

    if (!apiUrl || !apiKey) {
      throw new Error('BuyWell Global API configuration missing');
    }

    const res = await fetch(`${apiUrl}/api/marketplace/user/lookup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Marketplace-Key': apiKey,
      },
      body: JSON.stringify({ identifier, identifier_type: type }),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) throw new Error('User lookup failed');
    const json = await res.json();
    return json.data;
  },

  async sendLinkOtp(bwUserId: number, channel: 'sms' | 'email') {
    const apiUrl = await getSiteConfig('payment_bwallet_api_url');
    const apiKey = await getSiteConfig('payment_bwallet_api_key');

    const res = await fetch(`${apiUrl}/api/marketplace/user/link-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Marketplace-Key': apiKey || '',
      },
      body: JSON.stringify({ bw_user_id: bwUserId, channel }),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) throw new Error('OTP send failed');
    return res.json();
  },

  async verifyLinkOtp(bwUserId: number, otp: string) {
    const apiUrl = await getSiteConfig('payment_bwallet_api_url');
    const apiKey = await getSiteConfig('payment_bwallet_api_key');

    const res = await fetch(`${apiUrl}/api/marketplace/user/verify-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Marketplace-Key': apiKey || '',
      },
      body: JSON.stringify({ bw_user_id: bwUserId, otp }),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'OTP verification failed');
    }
    return res.json();
  }
};

/**
 * PaymentGateway-compatible wrapper for BuyWell Wallet.
 * Order creation records gateway as "bwallet"; actual debit happens via /api/orders/[id]/pay-wallet.
 */
export const bwalletPaymentGateway: PaymentGateway = {
  name: 'bwallet',
  displayName: 'BuyWell Global Wallet',

  async isEnabled(): Promise<boolean> {
    return (await getSiteConfig('payment_bwallet_enabled')) === 'true';
  },

  async createSession({ orderId, amount, currency }): Promise<PaymentSession> {
    return {
      gatewayName: 'bwallet',
      sessionId: `bw_${orderId}_${Date.now()}`,
      amount,
      currency,
      metadata: {},
    };
  },

  async verifyPayment(): Promise<PaymentVerifyResult> {
    // Wallet debit happens via /api/orders/[id]/pay-wallet, not here.
    return { verified: false };
  },
};
