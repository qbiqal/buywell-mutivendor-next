# BuyWell Multivendor Marketplace — Part 2 Blueprint
## BuyWell Global Integration: E-Commerce Wallet + User Sync

> Created: 2026-06-13  
> Prerequisite: Part 1 complete and deployed  
> Scope: Integrate buywellglobal.com e-commerce wallet as payment method + user sync strategy  
> BuyWell Backend: Laravel 12 + PHP (buywell-2025/buywell-backend)  
> Production URL: buywellglobal.com (existing live site)

---

## Table of Contents

1. [Integration Overview](#1-integration-overview)
2. [BuyWell Global — Existing Wallet System](#2-buywell-global--existing-wallet-system)
3. [New API Endpoints Required in BuyWell Backend](#3-new-api-endpoints-required-in-buywell-backend)
4. [BuyWell Wallet Gateway — Full Implementation](#4-buywell-wallet-gateway--full-implementation)
5. [Partial Payment Flow](#5-partial-payment-flow)
6. [User Sync Strategy — Production-Ready Approach](#6-user-sync-strategy--production-ready-approach)
7. [Security Architecture](#7-security-architecture)
8. [Admin Configuration Panel](#8-admin-configuration-panel)
9. [Phase-by-Phase Development Plan](#9-phase-by-phase-development-plan)
10. [BuyWell Backend Changes Required](#10-buywell-backend-changes-required)
11. [Testing Strategy](#11-testing-strategy)
12. [Rollback & Risk Mitigation](#12-rollback--risk-mitigation)

---

## 1. Integration Overview

### 1.1 What We Are Building

BuyWell Global (buywellglobal.com) is an MLM platform with multiple named wallets per user. The `ecommerce` wallet holds non-withdrawable credits that users earn through the MLM program. The goal is to allow users who have an account on BuyWell Global to spend their `ecommerce` wallet balance on BuyWell Multivendor Marketplace (buywell.in).

### 1.2 Integration Topology

```
┌─────────────────────┐         ┌──────────────────────────┐
│   BuyWell           │  REST   │   BuyWell Global         │
│   Marketplace       │◄───────►│   API (Laravel)          │
│   buywell.in        │  HTTPS  │   buywellglobal.com/api  │
│   (Next.js)         │         │   (buywell-2025)         │
└─────────────────────┘         └──────────────────────────┘
         │                                    │
         │                                    │
    buywell.in/                    buywellglobal.com/
    users table                    users table (20k)
    (subset, lazy)                 wallets.ecommerce
```

### 1.3 Design Principles

1. **BuyWell Global is the wallet authority.** Balance always read live from its API. Never cache balance beyond one request.
2. **Debit is atomic with order creation.** Wallet debit and order creation happen in the same logical transaction — if either fails, both are reversed.
3. **User sync is lazy.** We never bulk-import all 20k users. A BuyWell Global user is linked to a marketplace account only when they actively log in or transact.
4. **No shared passwords.** Users link accounts via a one-time OTP or token flow, not by sharing credentials.
5. **Graceful degradation.** If BuyWell Global API is down, wallet payment is disabled but other gateways still work.

---

## 2. BuyWell Global — Existing Wallet System

### 2.1 Relevant Wallet

The `ecommerce` wallet in BuyWell Global:
- **Non-withdrawable** — users cannot cash out to bank
- Credited via `EPinClaimService` (₹250 per EPin claimed) and admin operations
- Used for e-commerce purchases (the integration we are building)
- Managed by `app/Services/MLM/WalletService.php` via Bavix Wallet

### 2.2 Existing Wallet API Endpoints

From the BuyWell backend (`routes/api.php`):

```
GET  /api/wallets/balances                  Returns all wallet balances for authenticated user
GET  /api/wallets/{walletType}/transactions  Returns transactions for a specific wallet type
POST /api/wallets/transfer                  Transfer between wallets (internal)
```

These endpoints require `auth:sanctum` Bearer token — they are **user-facing endpoints**, not suitable for server-to-server calls.

**What is missing** (must be built — see §3):
- Server-to-server wallet balance check by user identifier (phone/email)
- Server-to-server wallet debit for external purchase
- Wallet debit reversal (rollback)
- User lookup by phone/email returning wallet balance

---

## 3. New API Endpoints Required in BuyWell Backend

These endpoints must be added to `buywell-2025/buywell-backend`. They are **server-to-server** (machine-to-machine) using an API key, NOT user Bearer tokens.

### 3.1 Authentication Model for New Endpoints

Use a dedicated middleware `auth.external.marketplace`:

```php
// app/Http/Middleware/MarketplaceApiAuth.php

class MarketplaceApiAuth
{
    public function handle(Request $request, Closure $next)
    {
        $key = $request->header('X-Marketplace-Key');
        $expectedKey = config('services.marketplace.api_key'); // from .env or settings
        
        if (!$key || !hash_equals($expectedKey, $key)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }
        
        return $next($request);
    }
}
```

Register in `bootstrap/app.php`:
```php
->withMiddleware(function (Middleware $middleware) {
    $middleware->alias(['auth.marketplace' => MarketplaceApiAuth::class]);
})
```

### 3.2 New Route Group

Add to `routes/api.php`:

```php
// External marketplace integration endpoints
// Protected by API key, not user auth
Route::prefix('marketplace')->middleware(['auth.marketplace', 'throttle:60,1'])->group(function () {
    
    // Lookup user and get ecommerce wallet balance
    Route::post('wallet/balance', [MarketplaceWalletController::class, 'balance']);
    
    // Debit ecommerce wallet (purchase)
    Route::post('wallet/debit', [MarketplaceWalletController::class, 'debit']);
    
    // Reverse a debit (rollback on order failure)
    Route::post('wallet/reverse', [MarketplaceWalletController::class, 'reverse']);
    
    // Verify a transaction reference
    Route::get('wallet/transaction/{ref}', [MarketplaceWalletController::class, 'verify']);
    
    // Sync user identity (link marketplace user to BuyWell Global user)
    Route::post('user/lookup', [MarketplaceUserController::class, 'lookup']);
    
    // Initiate OTP for account linking
    Route::post('user/link-otp', [MarketplaceUserController::class, 'sendLinkOtp']);
    
    // Verify OTP and return link token
    Route::post('user/verify-otp', [MarketplaceUserController::class, 'verifyLinkOtp']);
    
});
```

### 3.3 `POST /api/marketplace/wallet/balance`

**Request:**
```json
{
  "identifier": "9876543210",
  "identifier_type": "phone"
}
```

`identifier_type`: `phone` | `email` | `bw_user_id`

**Response (success):**
```json
{
  "success": true,
  "data": {
    "bw_user_id": 1234,
    "name": "Rajesh Kumar",
    "ecommerce_balance": 150000,
    "ecommerce_balance_formatted": "₹1,500.00",
    "currency": "INR"
  }
}
```

**Response (user not found):**
```json
{
  "success": false,
  "error": "USER_NOT_FOUND",
  "message": "No active BuyWell Global account found for this identifier"
}
```

**Implementation** (`app/Http/Controllers/Api/MarketplaceWalletController.php`):
```php
public function balance(Request $request): JsonResponse
{
    $request->validate([
        'identifier' => 'required|string',
        'identifier_type' => 'required|in:phone,email,bw_user_id',
    ]);

    $user = $this->findUser($request->identifier, $request->identifier_type);
    if (!$user) {
        return response()->json(['success' => false, 'error' => 'USER_NOT_FOUND'], 404);
    }

    $balance = $this->walletService->getWalletBalance($user->id, 'ecommerce');
    
    return response()->json([
        'success' => true,
        'data' => [
            'bw_user_id' => $user->id,
            'name' => $user->name,
            'ecommerce_balance' => (int) ($balance * 100), // paise
            'ecommerce_balance_formatted' => '₹' . number_format($balance, 2),
            'currency' => 'INR',
        ],
    ]);
}
```

### 3.4 `POST /api/marketplace/wallet/debit`

**Request:**
```json
{
  "bw_user_id": 1234,
  "amount": 100000,
  "currency": "INR",
  "reference": "BW-MV-2026-00123",
  "description": "BuyWell Marketplace Order #BW-2026-0042",
  "idempotency_key": "order-456-wallet-debit-attempt-1"
}
```

- `amount`: in paise
- `reference`: marketplace order reference (for traceability)
- `idempotency_key`: prevents double debits on retry

**Response (success):**
```json
{
  "success": true,
  "data": {
    "transaction_id": "bwg_txn_abc123",
    "bw_user_id": 1234,
    "amount_debited": 100000,
    "balance_after": 50000,
    "reference": "BW-MV-2026-00123",
    "debited_at": "2026-06-13T10:30:00Z"
  }
}
```

**Response (insufficient balance):**
```json
{
  "success": false,
  "error": "INSUFFICIENT_BALANCE",
  "data": {
    "available": 80000,
    "requested": 100000
  }
}
```

**Idempotency**: Store `idempotency_key` in a `marketplace_transactions` table. If same key seen again, return the original response.

**Implementation notes:**
- Use `DB::transaction()` wrapping `walletService->debitWithUser($user, 'ecommerce', $amount, $description)`
- The Bavix Wallet `debitWithUser` already does balance checking and throws on insufficient funds
- Log to `marketplace_transactions` table for audit trail
- Rate limit per user: max 5 debits per minute

### 3.5 `POST /api/marketplace/wallet/reverse`

**Request:**
```json
{
  "transaction_id": "bwg_txn_abc123",
  "reason": "Order creation failed — payment reversed"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "reversal_id": "bwg_rev_xyz789",
    "original_transaction_id": "bwg_txn_abc123",
    "amount_credited_back": 100000,
    "balance_after": 150000,
    "reversed_at": "2026-06-13T10:30:45Z"
  }
}
```

**Rules:**
- Can only reverse a debit that is in `status=completed` and not already reversed
- Creates a credit entry to restore balance
- Sets `marketplace_transactions.status = 'reversed'`
- Window: allow reversal up to 24 hours after debit

### 3.6 New `marketplace_transactions` Table (BuyWell Backend)

```sql
CREATE TABLE marketplace_transactions (
  id                  BIGSERIAL PRIMARY KEY,
  bw_user_id          INTEGER NOT NULL,
  marketplace_ref     VARCHAR(100) NOT NULL,    -- our order reference
  idempotency_key     VARCHAR(200) UNIQUE,
  transaction_type    VARCHAR(20) NOT NULL,     -- debit | reversal
  amount              BIGINT NOT NULL,          -- paise
  wallet_transaction_id BIGINT,                -- FK to Bavix wallet_transactions
  status              VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- pending | completed | failed | reversed
  reason              TEXT,
  metadata            JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_marketplace_txns_ref ON marketplace_transactions(marketplace_ref);
CREATE INDEX idx_marketplace_txns_idem ON marketplace_transactions(idempotency_key);
CREATE INDEX idx_marketplace_txns_user ON marketplace_transactions(bw_user_id);
```

### 3.7 User Lookup & Account Linking Endpoints

#### `POST /api/marketplace/user/lookup`

**Request:**
```json
{ "identifier": "9876543210", "identifier_type": "phone" }
```

**Response:**
```json
{
  "success": true,
  "data": {
    "found": true,
    "bw_user_id": 1234,
    "name": "Rajesh Kumar",
    "has_ecommerce_wallet": true,
    "ecommerce_balance": 150000
  }
}
```

#### `POST /api/marketplace/user/link-otp`

Sends OTP to the user's registered phone/email on BuyWell Global to confirm they own that account.

```json
{ "bw_user_id": 1234, "channel": "sms" }
```

#### `POST /api/marketplace/user/verify-otp`

```json
{ "bw_user_id": 1234, "otp": "483920" }
```

**Response on success:**
```json
{
  "success": true,
  "data": {
    "link_token": "eyJhbGciOiJ...",
    "bw_user_id": 1234,
    "expires_in": 300
  }
}
```

`link_token` is a short-lived JWT (5 min) signed with the marketplace API secret. The marketplace backend uses this token to store the link, not the raw user_id.

---

## 4. BuyWell Wallet Gateway — Full Implementation

### 4.1 Gateway File

`src/lib/payment/bwallet.ts` (replaces stub from Part 1):

```ts
import { getConfig } from '@/lib/config';
import { db } from '@/lib/db';
import { orders, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const GATEWAY_KEY = 'bwallet' as const;

export const bwalletGateway = {
  key: GATEWAY_KEY,
  name: 'BuyWell Wallet',

  async isEnabled(): Promise<boolean> {
    return (await getConfig('payment_bwallet_enabled')) === 'true';
  },

  async getBalance(bwUserId: number): Promise<number> {
    // Returns balance in paise. Throws if API unavailable.
    const apiUrl = await getConfig('payment_bwallet_api_url');
    const apiKey = await getConfig('payment_bwallet_api_key');

    const res = await fetch(`${apiUrl}/api/marketplace/wallet/balance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Marketplace-Key': apiKey,
      },
      body: JSON.stringify({ identifier: String(bwUserId), identifier_type: 'bw_user_id' }),
      signal: AbortSignal.timeout(5000),  // 5s timeout
    });

    if (!res.ok) throw new Error(`BuyWell Global API error: ${res.status}`);
    const json = await res.json();
    return json.data.ecommerce_balance; // paise
  },

  async debit(params: {
    bwUserId: number;
    amount: number;           // paise
    orderId: number;
    idempotencyKey: string;
  }): Promise<{ transactionId: string }> {
    const apiUrl = await getConfig('payment_bwallet_api_url');
    const apiKey = await getConfig('payment_bwallet_api_key');

    const res = await fetch(`${apiUrl}/api/marketplace/wallet/debit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Marketplace-Key': apiKey,
      },
      body: JSON.stringify({
        bw_user_id: params.bwUserId,
        amount: params.amount,
        currency: 'INR',
        reference: `BW-MV-ORDER-${params.orderId}`,
        description: `BuyWell Marketplace Order #${params.orderId}`,
        idempotency_key: params.idempotencyKey,
      }),
      signal: AbortSignal.timeout(10000),
    });

    const json = await res.json();
    if (!json.success) {
      throw Object.assign(new Error(json.error), { code: json.error, data: json.data });
    }
    return { transactionId: json.data.transaction_id };
  },

  async reverse(transactionId: string, reason: string): Promise<void> {
    const apiUrl = await getConfig('payment_bwallet_api_url');
    const apiKey = await getConfig('payment_bwallet_api_key');

    await fetch(`${apiUrl}/api/marketplace/wallet/reverse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Marketplace-Key': apiKey },
      body: JSON.stringify({ transaction_id: transactionId, reason }),
      signal: AbortSignal.timeout(10000),
    });
  },
};
```

### 4.2 Order Schema Extension

Add to `orders` table:

```sql
ALTER TABLE orders ADD COLUMN bw_wallet_amount INTEGER DEFAULT 0;       -- paise from wallet
ALTER TABLE orders ADD COLUMN bw_wallet_transaction_id VARCHAR(100);    -- BuyWell Global txn ID
ALTER TABLE orders ADD COLUMN bw_user_id INTEGER;                       -- BuyWell Global user ID
ALTER TABLE orders ADD COLUMN secondary_gateway VARCHAR(30);            -- razorpay | offline_qr
ALTER TABLE orders ADD COLUMN secondary_gateway_ref VARCHAR(200);       -- Razorpay payment ID etc.
```

Also add to `users` table:
```sql
ALTER TABLE users ADD COLUMN bw_user_id INTEGER UNIQUE;  -- BuyWell Global user ID (after linking)
ALTER TABLE users ADD COLUMN bw_linked_at TIMESTAMPTZ;
```

---

## 5. Partial Payment Flow

### 5.1 Checkout UI Flow (Client Side)

```
Step 1: Cart review
Step 2: Address
Step 3: Payment method selection
   ↓
If BuyWell Wallet enabled AND user has linked BuyWell account:
  Show: "BuyWell Wallet (Balance: ₹1,500)"
  Toggle: [Use wallet]
  If toggled:
    Show: Amount to use from wallet (default: min(balance, total))
    If balance < total:
      Show: "Remaining ₹500 via:" [Razorpay] [Offline QR]
    If balance >= total:
      Show: "Full amount covered by wallet" → [Place Order]
Step 4: Confirmation
```

If user hasn't linked BuyWell account:
- Show "Link your BuyWell Global account to use wallet"
- [Link Account] → modal: enter phone → OTP → link

### 5.2 Server-Side Order Creation with Partial Wallet

```
POST /api/orders {
  ...cartItems,
  payment_method: 'bwallet+razorpay',  // or 'bwallet' alone
  wallet_amount: 100000,               // paise
  secondary_method: 'razorpay'
}

Server flow:
1. Validate cart, recalculate total server-side
2. Validate: wallet_amount <= total
3. Calculate: secondary_amount = total - wallet_amount
4. Look up user.bw_user_id from users table
5. Check live wallet balance: bwalletGateway.getBalance(bw_user_id)
6. Validate: balance >= wallet_amount
7. If secondary_method = 'razorpay':
   a. Create Razorpay order for secondary_amount
   b. Return { razorpay_order_id, wallet_amount, secondary_amount }
8. Client:
   a. Opens Razorpay for secondary_amount
   b. On Razorpay success → calls POST /api/orders/[id]/complete-payment
9. POST /api/orders/[id]/complete-payment {
     razorpay_payment_id, razorpay_order_id, razorpay_signature
   }
   Server:
   a. Verify Razorpay signature
   b. Generate idempotency_key = `order-${id}-wallet-${attempt}`
   c. Call bwalletGateway.debit({ bwUserId, amount: wallet_amount, orderId, idempotencyKey })
   d. On wallet debit success → mark order paid, store bw_wallet_transaction_id
   e. On wallet debit failure → reverse Razorpay (via refund API) → mark order failed
```

### 5.3 Atomic Guarantee

The critical constraint is that Razorpay charges and wallet debits must both succeed or both be reversed. We achieve this with a two-phase approach:

```
Phase 1: Razorpay charge (online gateway processes first)
Phase 2: Wallet debit (after Razorpay confirmed)

On Phase 2 failure:
  → Initiate Razorpay refund for secondary_amount
  → Log failed_payment event on order
  → Notify customer: "Payment failed, refund initiated"

The reverse is NOT done: we do not debit wallet before Razorpay confirmation.
Reason: Razorpay is the harder component to reverse (refunds take 5-7 days).
        Wallet debit happens last, is instantly reversible.
```

### 5.4 Wallet-Only Payment (balance covers full amount)

```
POST /api/orders {
  payment_method: 'bwallet',
  wallet_amount: total_amount
}

Server flow:
1. Validate balance >= total
2. Create order with status='pending_wallet'
3. Call bwalletGateway.debit(...)
4. On success → order.status = 'paid', order.payment_status = 'paid'
5. On failure → order.status = 'failed', notify customer
```

---

## 6. User Sync Strategy — Production-Ready Approach

### 6.1 The Problem

BuyWell Global has ~20,000 members. The question is: which of these should exist on BuyWell Marketplace?

**Decision: Lazy sync — never bulk-import.**

Reasons:
1. Most of the 20k users may never shop on the marketplace
2. Bulk import would require passwords (impossible) or a forced password-reset flow for 20k users (bad UX)
3. Importing inactive users inflates your user table with no business value
4. It creates DPDP/GDPR consent issues — users didn't consent to their data being synced here

### 6.2 Lazy Sync Strategy

A BuyWell Global user appears on Marketplace **only when they take an action**:

**Trigger 1: Account Linking (Explicit)**  
User is browsing marketplace, wants to pay with BuyWell Wallet.  
Clicks "Link BuyWell Account" → enters phone → receives OTP → links.  
On link: `users.bw_user_id` is set. They can now use wallet.

**Trigger 2: Same-Phone Registration**  
User registers on marketplace with the same phone number as their BuyWell Global account.  
After registration, system calls `POST /api/marketplace/user/lookup` with their phone.  
If found: show a banner "You have a BuyWell Global account! Link it to use your wallet."  
If user clicks "Link": OTP verification → link stored.

**Trigger 3: Admin-Initiated (Future)**  
Admin can send a bulk invite email to BuyWell Global members, pointing them to marketplace registration. They self-register.

### 6.3 Data That Crosses Over

When a user is linked, we only store:
- `users.bw_user_id` (the BuyWell Global integer user ID)
- `users.bw_linked_at`

We do NOT copy:
- MLM tree data
- Wallet transaction history
- Referral data
- Personal documents / KYC

The marketplace is a separate platform. The only bridge is the ecommerce wallet balance at time of payment.

### 6.4 Showing Wallet Balance

Once linked, every time the user opens the checkout payment section:
1. Server calls `bwalletGateway.getBalance(user.bw_user_id)` live
2. Balance is shown fresh — no caching (it changes as they earn MLM credits)
3. If API call fails: show "Wallet unavailable — use another payment method" (graceful degradation)

### 6.5 What About Displaying BuyWell Global Members in Marketplace?

**Recommendation: Do NOT display BuyWell Global members as marketplace users until they register.**

Options and recommendation:

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| Import all 20k on launch | Instant "user base" | DPDP consent issue, fake activity, password problem | ❌ No |
| Import only active buyers | Smaller, more relevant | Still consent issue, still need password solution | ❌ No |
| Lazy sync (recommended) | DPDP compliant, correct data | Slower growth | ✅ Yes |
| Lazy sync + email invitation campaign | Compliant + faster adoption | Requires email send to 20k | ✅ Yes (Phase 2b) |

**Email invitation campaign** (optional Phase 2b):
- Export BuyWell Global user emails via admin API
- Send invitation email: "Your ecommerce wallet balance is ready to use on BuyWell Marketplace"
- Unique signup link with pre-filled referral/phone
- Users who click → register → auto-link on phone match

This gives adoption without forcing import. Fully DPDP-compliant (marketing email with unsubscribe).

---

## 7. Security Architecture

### 7.1 API Key Management

The marketplace API key for calling BuyWell Global:
- Stored encrypted in `site_config` (`payment_bwallet_api_key`)
- Never exposed in client-side code or logs
- Rotated via Admin Settings without code deployment
- Minimum 32 characters, cryptographically random

On BuyWell Global side:
- Store in `config/services.php` reading from `.env MARKETPLACE_API_KEY`
- Rate limit: 60 requests/minute per IP
- Log all marketplace API calls to `marketplace_transactions` table

### 7.2 OTP-Based Account Linking

The OTP for account linking is:
- Sent via BuyWell Global's existing OTP system
- 6 digits, expires in 5 minutes
- Rate limited: 3 OTP requests per phone per hour
- OTP stored hashed in BuyWell Global DB (not in marketplace DB)
- After verification: short-lived `link_token` JWT (5 min, RS256, signed by BuyWell Global)
- Marketplace verifies `link_token` signature before storing `bw_user_id`

### 7.3 Idempotency Keys

Every wallet debit must have a unique idempotency key:
```
Format: `mv-order-{orderId}-attempt-{attemptNumber}`
Example: `mv-order-4521-attempt-1`
```

If the same key is received again, BuyWell Global returns the original response without a new debit. This prevents double-charging on network retries.

### 7.4 Webhook Security (Marketplace → BuyWell Global Notifications)

BuyWell Global can optionally push wallet balance updates or debit confirmations via webhook to marketplace. Secure with HMAC-SHA256 signature header:
```
X-BuyWell-Signature: sha256=<HMAC of body using shared secret>
```

### 7.5 Sensitive Data Handling

- `bw_user_id` in marketplace DB is an internal integer — not PII
- Phone numbers used only for OTP lookup, not stored in marketplace DB
- Link token is ephemeral — not stored, only verified and discarded
- All API communication over TLS/HTTPS only

---

## 8. Admin Configuration Panel

### 8.1 BuyWell Wallet Settings (extend existing `/admin/settings` Payments tab)

```
BuyWell Wallet Integration
  [x] Enable BuyWell Wallet at Checkout

  API Configuration
    API Base URL: [https://buywellglobal.com]
    API Key:      [●●●●●●●●●●●●] [Show] [Rotate]

  Payment Rules
    Min order amount for wallet usage: [₹ 100]
    Max wallet usage per order:        [100 %] (or fixed ₹ amount)
    Allow partial payment:             [x] Yes

  [Test Connection]   → calls /api/marketplace/wallet/balance with a test user
  [Save Settings]
```

### 8.2 Linked Accounts Report

Route: `/admin/reports/bw-linked-accounts`

Shows:
- Total marketplace users with BuyWell Global account linked
- Recent linkings (last 30 days)
- Total wallet payments processed (count + amount)
- Failed wallet payments

### 8.3 Wallet Transaction Log

Route: `/admin/reports/wallet-transactions`

Table: Date | Customer | Order | Wallet Amount | Status | BW Transaction ID

Sortable, filterable by date range and status.

---

## 9. Phase-by-Phase Development Plan

### Phase P2.1 — BuyWell Backend: New Endpoints [~4 days in buywell-2025 project]

**Who works on this**: Changes go into `buywell-2025/buywell-backend` (Laravel PHP project, separate repo/deploy).

Tasks:
- [ ] Create `marketplace_transactions` DB migration
- [ ] Create `MarketplaceApiAuth` middleware
- [ ] Create `MarketplaceWalletController` with balance, debit, reverse, verify methods
- [ ] Create `MarketplaceUserController` with lookup, link-otp, verify-otp methods
- [ ] Add route group `/api/marketplace/*`
- [ ] Add `MARKETPLACE_API_KEY` to BuyWell Global `.env` and Coolify env vars
- [ ] Unit tests for debit idempotency
- [ ] Unit test for insufficient balance response
- [ ] Deploy to BuyWell Global production
- [ ] Test with Postman/curl from marketplace server

**Deliverable**: `curl -X POST https://buywellglobal.com/api/marketplace/wallet/balance -H "X-Marketplace-Key: ..." -d '{"identifier":"9876543210","identifier_type":"phone"}'` returns correct balance.

---

### Phase P2.2 — Marketplace: BuyWell Wallet Gateway [~3 days in buywell-multivendor-next]

Tasks:
- [ ] Complete `src/lib/payment/bwallet.ts` (full implementation, not stub)
- [ ] DB migration: add `bw_user_id`, `bw_linked_at` to `users` table
- [ ] DB migration: add wallet columns to `orders` table
- [ ] Account linking flow: `/profile/link-bwallet` page
- [ ] API: `POST /api/auth/bwallet-link-otp` → calls BuyWell Global API
- [ ] API: `POST /api/auth/bwallet-verify-otp` → verifies token, stores bw_user_id
- [ ] Enable `payment_bwallet_enabled = true` in Admin Settings
- [ ] Test balance check in checkout

---

### Phase P2.3 — Checkout: Partial Payment UI [~4 days]

Tasks:
- [ ] Update checkout payment step: show wallet option when linked + enabled
- [ ] Wallet balance display (live, graceful degradation if API down)
- [ ] Partial payment calculator UI
- [ ] `POST /api/orders` supports `payment_method: 'bwallet+razorpay'` and `'bwallet'`
- [ ] `POST /api/orders/[id]/complete-payment` two-phase commit
- [ ] Razorpay reversal on wallet debit failure
- [ ] Order confirmation shows wallet amount used

---

### Phase P2.4 — User Sync + Invitation Campaign [~2 days]

Tasks:
- [ ] Same-phone auto-link suggestion on registration
- [ ] Admin report: linked accounts, wallet transactions
- [ ] Email invitation template (for future campaign, not auto-sent)
- [ ] Documentation for BuyWell Global admin to run invite campaign

---

### Phase P2.5 — QA, Load Testing, Production [~3 days]

Tasks:
- [ ] End-to-end test: BuyWell Global user → link account → add to cart → wallet payment
- [ ] End-to-end test: partial payment (wallet ₹1000 + Razorpay ₹500)
- [ ] Test: wallet API timeout → graceful degradation
- [ ] Test: insufficient balance error handling
- [ ] Test: idempotency key prevents double debit on retry
- [ ] Load test: 50 concurrent wallet balance checks (BuyWell Global API must handle)
- [ ] Deploy → smoke test → monitor error logs

---

## 10. BuyWell Backend Changes Required

### Summary Table

| Change | File | Priority |
|---|---|---|
| New migration: marketplace_transactions | `database/migrations/` | P0 |
| New middleware: MarketplaceApiAuth | `app/Http/Middleware/` | P0 |
| New controller: MarketplaceWalletController | `app/Http/Controllers/Api/` | P0 |
| New controller: MarketplaceUserController | `app/Http/Controllers/Api/` | P0 |
| New routes: /api/marketplace/* | `routes/api.php` | P0 |
| New .env key: MARKETPLACE_API_KEY | `.env`, Coolify env | P0 |
| New config: config/services.php marketplace key | `config/services.php` | P0 |
| Unit tests for new endpoints | `tests/Feature/Marketplace/` | P1 |
| Rate limiting tuning for marketplace routes | `routes/api.php` | P1 |
| Webhook endpoint for balance updates (optional) | Future | P2 |

### 10.1 `WalletService` Helper Needed

The existing `WalletService::getWalletBalance($userId, $walletSlug)` method should return the balance in smallest currency unit (paise). Verify this returns paise not rupees — if it returns rupees, multiply by 100 before returning from API.

```php
// In MarketplaceWalletController
$balanceRupees = $this->walletService->getWalletBalance($user->id, 'ecommerce');
$balancePaise = (int) round($balanceRupees * 100);
```

### 10.2 Existing Wallet Balance Endpoint vs New Endpoint

The existing `GET /api/wallets/balances` returns all wallet balances for the *authenticated user* (their own Bearer token). We cannot use this for server-to-server calls because:
1. It requires the user to be logged in with their Sanctum token
2. We don't have (and must not have) the user's Sanctum token on the marketplace server

The new `POST /api/marketplace/wallet/balance` uses our API key and the user's identifier, not the user's token. This is the correct pattern for M2M (machine-to-machine) calls.

---

## 11. Testing Strategy

### 11.1 Integration Test Matrix

| Scenario | Expected |
|---|---|
| User has linked account, sufficient balance, wallet-only | Order paid, wallet debited, balance reduced |
| User has linked account, insufficient balance | Error shown, order not created |
| Partial payment: wallet ₹1000 + Razorpay ₹500 | Razorpay charged ₹500, wallet debited ₹1000 |
| Razorpay fails after wallet already checked | No debit happens (debit is after Razorpay) |
| Wallet API times out during checkout | Wallet option hidden, other gateways shown |
| Wallet debit succeeds, Razorpay then fails | Wallet reversed, customer notified |
| Same idempotency key sent twice | Original response returned, no double debit |
| User unlinks account | Wallet option disappears from checkout |
| BuyWell Global API returns 503 | Graceful degradation, no checkout crash |

### 11.2 Staging Environment

Before production, test against a BuyWell Global staging/dev environment:
- Create a `MARKETPLACE_API_KEY_TEST` in BuyWell Global `.env.testing`
- Use test user IDs with seeded ecommerce wallet balances
- Set `payment_bwallet_api_url` in marketplace Admin Settings to staging URL during testing

---

## 12. Rollback & Risk Mitigation

### 12.1 Feature Flag

`payment_bwallet_enabled` in Admin Settings is the kill switch. If any issue arises:
1. Admin sets `payment_bwallet_enabled = false`
2. Wallet option disappears from checkout immediately (on next request, cache respects 60s TTL)
3. No code deployment needed

### 12.2 Partial Outage Handling

```ts
// In checkout payment step server component
try {
  balance = await bwalletGateway.getBalance(user.bwUserId);
} catch {
  balance = null;  // API unavailable
}
// balance === null → don't show wallet option in UI
```

If balance check fails, the wallet payment option is simply not shown. The user can still pay via other gateways.

### 12.3 Transaction Reconciliation

Daily reconciliation job (run via BuyWell Global admin or marketplace cron):
1. List all `marketplace_transactions` with `status=completed` for the day
2. Cross-check against marketplace `orders` with `bw_wallet_transaction_id` set
3. Flag any discrepancies for manual review

### 12.4 DPDP/GDPR Considerations

- Wallet integration stores only `bw_user_id` (an opaque integer) — not name, phone, or financial data
- The `bw_user_id` linking requires explicit user consent (OTP verification action)
- Users can unlink at any time from `/profile` → this sets `bw_user_id = NULL`
- DPDP compliance checklist in `/admin/compliance` should include "BuyWell Wallet data handling"

---

## Appendix A — BuyWell Backend File List (New Files)

```
buywell-backend/
  database/migrations/
    2026_xx_xx_create_marketplace_transactions_table.php
  app/Http/Middleware/
    MarketplaceApiAuth.php
  app/Http/Controllers/Api/
    MarketplaceWalletController.php
    MarketplaceUserController.php
  tests/Feature/Marketplace/
    WalletBalanceTest.php
    WalletDebitTest.php
    WalletReverseTest.php
    UserLookupTest.php
    AccountLinkingTest.php
  config/services.php  (add marketplace.api_key)
  .env  (add MARKETPLACE_API_KEY=...)
```

---

## Appendix B — BuyWell Marketplace File List (New Files for Part 2)

```
buywell-multivendor-next/
  src/
    lib/
      payment/
        bwallet.ts                  (full impl, replaces stub)
    app/
      (customer)/
        profile/
          link-bwallet/
            page.tsx                (account linking UI)
            LinkBwalletClient.tsx
      api/
        auth/
          bwallet-link-otp/route.ts
          bwallet-verify-otp/route.ts
        orders/
          [id]/
            complete-payment/route.ts (two-phase commit)
      (admin)/
        admin/
          reports/
            bw-linked-accounts/page.tsx
            wallet-transactions/page.tsx
    components/
      checkout/
        WalletPaymentOption.tsx
        PartialPaymentCalculator.tsx
```

---

## Appendix C — Environment Variables Reference

### Marketplace (buywell.in)
```env
# Added for Part 2
BUYWELL_GLOBAL_API_URL=https://buywellglobal.com
BUYWELL_GLOBAL_API_KEY=<set-in-admin-settings-encrypted>
# (these are DB-first config keys, env is fallback only)
```

### BuyWell Global (buywellglobal.com)
```env
# New for marketplace integration
MARKETPLACE_API_KEY=<32-char-random-key>
MARKETPLACE_RATE_LIMIT=60  # requests per minute
```

---

## Appendix D — Recommended API Key Rotation Procedure

1. Generate new key: `openssl rand -hex 32`
2. Add new key to BuyWell Global `.env` as `MARKETPLACE_API_KEY_NEW`
3. Update `MarketplaceApiAuth` middleware to accept both old and new keys (rolling rotation)
4. Deploy BuyWell Global
5. Update `payment_bwallet_api_key` in Marketplace Admin Settings with new key
6. Remove `MARKETPLACE_API_KEY_OLD` support from BuyWell Global
7. Deploy BuyWell Global again
8. Total downtime: 0

---

*End of Part 2 Blueprint*  
*See `docs/part1.md` for multivendor conversion blueprint.*  
*Proceed with Part 1 Phases 0–7 before starting Part 2.*
