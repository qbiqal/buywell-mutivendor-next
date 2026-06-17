"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCart } from "@/components/shop/Cart/CartContext";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { formatInr } from "@/lib/utils";
import styles from "./checkout.module.css";

type AuthStatus = "checking" | "loggedIn" | "guest";
type PaymentMethod = "wallet" | "razorpay" | "offline_qr";

interface AddressForm {
  name: string; phone: string; line1: string; line2: string;
  city: string; state: string; pincode: string;
}

const EMPTY_ADDR: AddressForm = { name: "", phone: "", line1: "", line2: "", city: "", state: "", pincode: "" };

interface Props {
  savedAddress:    { name: string; phone: string; line1: string; line2: string | null; city: string; state: string; pincode: string; id: string } | null;
  bwalletEnabled:  boolean;
  razorpayEnabled: boolean;
  offlineEnabled:  boolean;
  razorpayKeyId:   string;
  companyName:     string;
}

export default function CheckoutClient({ savedAddress, bwalletEnabled, razorpayEnabled, offlineEnabled, razorpayKeyId, companyName }: Props) {
  const router    = useRouter();
  const params    = useSearchParams();
  const { items, totalInr, hydrated, clearCart } = useCart();
  const { error: showError, success: showSuccess, warning: showWarn } = useToast();

  const isSample = params.get("sample") === "true";

  const [authStatus, setAuthStatus] = useState<AuthStatus>("checking");
  const [loading,    setLoading]    = useState(false);
  const [notes,      setNotes]      = useState("");

  // Address
  const [address,    setAddress]    = useState<AddressForm>(
    savedAddress
      ? { name: savedAddress.name, phone: savedAddress.phone, line1: savedAddress.line1,
          line2: savedAddress.line2 ?? "", city: savedAddress.city, state: savedAddress.state, pincode: savedAddress.pincode }
      : EMPTY_ADDR
  );
  const [billing,    setBilling]    = useState<AddressForm>(EMPTY_ADDR);
  const [sameBilling, setSameBilling] = useState(true);
  const [saveAddress, setSaveAddrFlag] = useState(!savedAddress); // only prompt if no saved address

  const setAddr = (k: keyof AddressForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setAddress(p => ({ ...p, [k]: e.target.value }));
  const setBill = (k: keyof AddressForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setBilling(p => ({ ...p, [k]: e.target.value }));

  // Payment method
  const defaultMethod: PaymentMethod = bwalletEnabled ? "wallet" : razorpayEnabled ? "razorpay" : "offline_qr";
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(defaultMethod);

  // Wallet state
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletLinked,  setWalletLinked]  = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);

  // Partial payment confirmation modal
  const [showPartialModal, setShowPartialModal] = useState(false);
  const [pendingOrderId,   setPendingOrderId]   = useState("");
  const [pendingOrderNum,  setPendingOrderNum]  = useState("");
  const [pendingTotal,     setPendingTotal]     = useState(0);
  const [pendingToken,     setPendingToken]     = useState("");

  // Guest account creation
  const [accountMode,  setAccountMode]  = useState<"guest" | "create">("guest");
  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const SHIPPING   = totalInr >= 99900 ? 0 : 6000;
  const grandTotal = totalInr + SHIPPING;

  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.ok ? r.json() : null)
      .then(d => setAuthStatus(d?.success ? "loggedIn" : "guest"))
      .catch(() => setAuthStatus("guest"));
  }, []);

  // Fetch wallet balance when wallet method selected
  useEffect(() => {
    if (!bwalletEnabled || paymentMethod !== "wallet") return;
    setWalletLoading(true);
    fetch("/api/customer/bwallet/balance")
      .then(r => r.json())
      .then(d => {
        if (d.success) { setWalletLinked(d.linked); setWalletBalance(d.balance ?? 0); }
      })
      .finally(() => setWalletLoading(false));
  }, [bwalletEnabled, paymentMethod]);

  const walletCoversFull = walletBalance >= grandTotal;
  const walletShortfall  = walletLinked && !walletCoversFull ? grandTotal - walletBalance : 0;

  // ─── Razorpay helper ─────────────────────────────────────────────────────────
  async function openRazorpay(orderId: string, amount: number, orderNumber: string): Promise<boolean> {
    const sessionRes = await fetch("/api/payment/razorpay/create-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, amount }),
    });
    const session = await sessionRes.json();
    if (!sessionRes.ok || !session.razorpayOrderId) {
      showError(session.error ?? "Could not create Razorpay session");
      return false;
    }

    await new Promise<void>((resolve, reject) => {
      if ((window as any).Razorpay) { resolve(); return; }
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Failed to load Razorpay"));
      document.head.appendChild(s);
    });

    return new Promise<boolean>(resolve => {
      const rzp = new (window as any).Razorpay({
        key: razorpayKeyId,
        order_id: session.razorpayOrderId,
        amount: session.amount,
        currency: "INR",
        name: companyName,
        description: `Order ${orderNumber}`,
        prefill: { name: address.name, contact: address.phone },
        theme: { color: "#0d7659" },
        handler: async (resp: any) => {
          try {
            const v = await fetch("/api/payment/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderId, razorpayOrderId: resp.razorpay_order_id, razorpayPaymentId: resp.razorpay_payment_id, razorpaySignature: resp.razorpay_signature }),
            });
            const vd = await v.json();
            if (vd.success) { resolve(true); } else { showError("Payment verification failed. Contact support."); resolve(false); }
          } catch { showError("Verification error. Contact support."); resolve(false); }
        },
        modal: { ondismiss: () => resolve(false) },
      });
      rzp.open();
    });
  }

  // ─── Place order ─────────────────────────────────────────────────────────────
  async function placeOrder() {
    if (!isSample && items.length === 0) return;
    if (!address.name || !address.phone || !address.line1 || !address.city || !address.state || !address.pincode) {
      showError("Please fill all required delivery address fields"); return;
    }

    setLoading(true);
    try {
      // Guest account creation
      if (authStatus === "guest" && accountMode === "create") {
        const nameParts = address.name.trim().split(/\s+/);
        const regRes = await fetch("/api/auth/register", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, firstName: nameParts[0] || "Customer", lastName: nameParts.slice(1).join(" ") || undefined, phone: address.phone }),
        });
        const regData = await regRes.json();
        if (!regData.success) { showError(regData.error ?? "Could not create account"); return; }
      }

      // Build billing address
      const billingAddr = sameBilling ? address : billing;

      // Create order
      const res = await fetch("/api/orders", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: isSample ? [] : items.map(i => ({
            variantId: i.variantId, productName: i.productName, variantName: i.variantName,
            imageUrl: i.imageUrl, unitPriceInr: i.unitPriceInr, quantity: i.quantity,
          })),
          address: { ...address, billingAddress: billingAddr },
          notes,
          isSampleRequest: isSample,
        }),
      });
      const data = await res.json();
      if (!data.success) { showError(data.error ?? "Failed to place order"); return; }

      const { orderId, orderNumber, totalInr: orderTotal, uploadToken } = data.data;

      // Save address if requested
      if (authStatus === "loggedIn" && saveAddress) {
        fetch("/api/customer/addresses", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: address.name, phone: address.phone, line1: address.line1, line2: address.line2 || null, city: address.city, state: address.state, pincode: address.pincode, isDefault: true }),
        }).catch(() => {});
      }

      if (!isSample) clearCart();

      // ── Route based on payment method ────────────────────────────────────────

      if (paymentMethod === "offline_qr") {
        const p = new URLSearchParams({ orderId, orderNumber, total: String(orderTotal), token: uploadToken });
        router.push(`/checkout/payment?${p}`);
        return;
      }

      if (paymentMethod === "razorpay") {
        const ok = await openRazorpay(orderId, orderTotal, orderNumber);
        if (ok) {
          showSuccess("Payment successful!", "Your order is confirmed.");
          router.push(`/checkout/confirmation?orderNumber=${orderNumber}&method=razorpay`);
        } else {
          showError("Payment was not completed. Your order is saved — you can retry from your orders page.");
          router.push(`/orders`);
        }
        return;
      }

      if (paymentMethod === "wallet") {
        if (!walletLinked) { showError("Your BuyWell wallet is not linked. Please link it first."); return; }
        if (walletBalance <= 0) { showError("Insufficient wallet balance."); return; }

        const amountFromWallet = Math.min(walletBalance, orderTotal);
        const remaining = orderTotal - amountFromWallet;

        // If wallet covers only part → confirm with user first
        if (remaining > 0) {
          if (!razorpayEnabled) {
            showError(`Your wallet balance (${formatInr(walletBalance)}) is less than the order total (${formatInr(orderTotal)}). Please enable Razorpay or top up your wallet.`);
            return;
          }
          setPendingOrderId(orderId);
          setPendingOrderNum(orderNumber);
          setPendingTotal(orderTotal);
          setPendingToken(uploadToken);
          setShowPartialModal(true);
          return;
        }

        // Wallet covers full amount
        const walletRes = await fetch(`/api/orders/${orderId}/pay-wallet`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: amountFromWallet }),
        });
        const wd = await walletRes.json();
        if (!wd.success) { showError(wd.error || "Wallet payment failed"); return; }
        showSuccess("Payment Successful!", "Your order is confirmed using wallet balance.");
        router.push(`/checkout/confirmation?orderNumber=${orderNumber}&method=wallet`);
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Confirm partial modal ────────────────────────────────────────────────────
  async function confirmPartialPayment() {
    setShowPartialModal(false);
    setLoading(true);
    try {
      const amountFromWallet = walletBalance;
      const remaining = pendingTotal - amountFromWallet;

      // 1. Debit wallet for partial
      const walletRes = await fetch(`/api/orders/${pendingOrderId}/pay-wallet`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amountFromWallet, secondaryGateway: "razorpay" }),
      });
      const wd = await walletRes.json();
      if (!wd.success) { showError(wd.error || "Wallet payment failed"); return; }

      showSuccess(`Wallet Applied`, `${formatInr(amountFromWallet)} from wallet. Please complete the remaining ${formatInr(remaining)} via Razorpay.`);

      // 2. Open Razorpay for remaining
      const rzpOk = await openRazorpay(pendingOrderId, remaining, pendingOrderNum);
      if (rzpOk) {
        showSuccess("Payment Successful!", "Your order is confirmed.");
        router.push(`/checkout/confirmation?orderNumber=${pendingOrderNum}&method=wallet`);
      } else {
        // Razorpay failed/dismissed — auto-refund wallet
        showWarn("Razorpay payment not completed. Refunding wallet balance...");
        const refundRes = await fetch(`/api/orders/${pendingOrderId}/refund-wallet`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: "Razorpay payment not completed by user" }),
        });
        const rd = await refundRes.json();
        if (rd.success) {
          showSuccess("Wallet Refunded", `${formatInr(amountFromWallet)} has been returned to your wallet.`);
        } else {
          showError("Auto-refund failed. Please contact support — your order has been cancelled.");
        }
        router.push("/orders");
      }
    } finally {
      setLoading(false);
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>{isSample ? "Request Free Sample" : "Checkout"}</h1>

        <div className={styles.layout}>
          {/* Left — forms */}
          <div className={styles.formCol}>

            {/* Guest account creation */}
            {authStatus === "guest" && (
              <div className={styles.section} style={{ marginBottom: 20 }}>
                <h2 className={styles.sectionTitle}>Your Account</h2>
                <div className={styles.accountToggleRow}>
                  <label className={[styles.accountOption, accountMode === "guest" ? styles.accountOptionActive : ""].join(" ")}>
                    <input type="radio" name="accountMode" value="guest" checked={accountMode === "guest"} onChange={() => setAccountMode("guest")} />
                    <span className={styles.accountOptionText}><strong>Continue as Guest</strong><small>No account needed</small></span>
                  </label>
                  <label className={[styles.accountOption, accountMode === "create" ? styles.accountOptionActive : ""].join(" ")}>
                    <input type="radio" name="accountMode" value="create" checked={accountMode === "create"} onChange={() => setAccountMode("create")} />
                    <span className={styles.accountOptionText}><strong>Create Account</strong><small>Track orders after checkout</small></span>
                  </label>
                </div>
                {accountMode === "create" && (
                  <div className={styles.accountFields}>
                    <Input label="Email *" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
                    <div className={styles.fieldGroup}>
                      <label className={styles.fieldLabel}>Password *</label>
                      <div className={styles.passwordWrap}>
                        <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 6 characters" className={styles.passwordInput} required />
                        <button type="button" className={styles.eyeBtn} onClick={() => setShowPassword(p => !p)}>
                          <span className="material-icons">{showPassword ? "visibility_off" : "visibility"}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Delivery address */}
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Delivery Address</h2>
              {savedAddress && (
                <p className={styles.savedNotice}>📍 Pre-filled from your saved address. Edit if needed.</p>
              )}
              <div className={styles.formFields}>
                <div className={styles.formGrid}>
                  <Input label="Full Name *"   value={address.name}    onChange={setAddr("name")}    placeholder="Rahul Sharma"     required />
                  <Input label="Phone *"        type="tel" value={address.phone}   onChange={setAddr("phone")}   placeholder="+91 XXXXX XXXXX" required />
                </div>
                <Input label="Address Line 1 *" value={address.line1}  onChange={setAddr("line1")}   placeholder="House/Flat number, street" required />
                <Input label="Address Line 2"   value={address.line2}  onChange={setAddr("line2")}   placeholder="Area, landmark" />
                <div className={styles.formGrid}>
                  <Input label="City *"    value={address.city}    onChange={setAddr("city")}    placeholder="Ranchi"    required />
                  <Input label="State *"   value={address.state}   onChange={setAddr("state")}   placeholder="Jharkhand" required />
                  <Input label="Pincode *" value={address.pincode} onChange={setAddr("pincode")} placeholder="834005"    required />
                </div>
              </div>

              {/* Save address toggle */}
              {authStatus === "loggedIn" && (
                <label className={styles.checkboxRow} style={{ marginTop: 16 }}>
                  <input type="checkbox" checked={saveAddress} onChange={e => setSaveAddrFlag(e.target.checked)} />
                  <span>Save this address for future orders</span>
                </label>
              )}
            </div>

            {/* Billing address */}
            <div className={styles.section} style={{ marginTop: 20 }}>
              <h2 className={styles.sectionTitle}>Billing Address</h2>
              <label className={styles.checkboxRow}>
                <input type="checkbox" checked={sameBilling} onChange={e => setSameBilling(e.target.checked)} />
                <span>Same as delivery address</span>
              </label>
              {!sameBilling && (
                <div className={styles.formFields} style={{ marginTop: 20 }}>
                  <div className={styles.formGrid}>
                    <Input label="Full Name *"   value={billing.name}    onChange={setBill("name")}    placeholder="Rahul Sharma"     required />
                    <Input label="Phone *"        type="tel" value={billing.phone}   onChange={setBill("phone")}   placeholder="+91 XXXXX XXXXX" required />
                  </div>
                  <Input label="Address Line 1 *" value={billing.line1}  onChange={setBill("line1")}   placeholder="House/Flat number, street" required />
                  <Input label="Address Line 2"   value={billing.line2}  onChange={setBill("line2")}   placeholder="Area, landmark" />
                  <div className={styles.formGrid}>
                    <Input label="City *"    value={billing.city}    onChange={setBill("city")}    placeholder="Ranchi"    required />
                    <Input label="State *"   value={billing.state}   onChange={setBill("state")}   placeholder="Jharkhand" required />
                    <Input label="Pincode *" value={billing.pincode} onChange={setBill("pincode")} placeholder="834005"    required />
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className={styles.section} style={{ marginTop: 20 }}>
              <Textarea label="Order Notes (Optional)" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any delivery instructions?" />
            </div>

            {/* Payment method */}
            {!isSample && (
              <div className={styles.section} style={{ marginTop: 20 }}>
                <h2 className={styles.sectionTitle}>Payment Method</h2>
                <div className={styles.paymentMethods}>

                  {/* BuyWell Wallet */}
                  {bwalletEnabled && (
                    <label className={[styles.paymentOption, paymentMethod === "wallet" ? styles.paymentOptionActive : ""].join(" ")}>
                      <input type="radio" name="payment" value="wallet" checked={paymentMethod === "wallet"} onChange={() => setPaymentMethod("wallet")} />
                      <span className={styles.paymentIcon}>👛</span>
                      <span className={styles.paymentInfo}>
                        <strong>BuyWell Wallet</strong>
                        {paymentMethod === "wallet" && (
                          <small>
                            {walletLoading ? "Loading balance..." :
                              !walletLinked ? "Account not linked — link from profile" :
                              walletBalance > 0 ? `Balance: ${formatInr(walletBalance)}${walletShortfall > 0 ? ` · ${formatInr(walletShortfall)} via Razorpay` : ""}` :
                              "Balance: ₹0 — insufficient"}
                          </small>
                        )}
                      </span>
                    </label>
                  )}

                  {/* Razorpay */}
                  {razorpayEnabled && (
                    <label className={[styles.paymentOption, paymentMethod === "razorpay" ? styles.paymentOptionActive : ""].join(" ")}>
                      <input type="radio" name="payment" value="razorpay" checked={paymentMethod === "razorpay"} onChange={() => setPaymentMethod("razorpay")} />
                      <span className={styles.paymentIcon}>💳</span>
                      <span className={styles.paymentInfo}>
                        <strong>Razorpay</strong>
                        <small>UPI · Card · Net Banking · Wallets</small>
                      </span>
                    </label>
                  )}

                  {/* Offline QR */}
                  {offlineEnabled && (
                    <label className={[styles.paymentOption, paymentMethod === "offline_qr" ? styles.paymentOptionActive : ""].join(" ")}>
                      <input type="radio" name="payment" value="offline_qr" checked={paymentMethod === "offline_qr"} onChange={() => setPaymentMethod("offline_qr")} />
                      <span className={styles.paymentIcon}>📱</span>
                      <span className={styles.paymentInfo}>
                        <strong>UPI / QR Code</strong>
                        <small>Scan QR and upload payment screenshot</small>
                      </span>
                    </label>
                  )}

                  {!bwalletEnabled && !razorpayEnabled && !offlineEnabled && (
                    <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>No payment methods are currently enabled. Please contact support.</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right — order summary */}
          <div className={styles.summaryCol}>
            <div className={styles.summaryCard}>
              <h2 className={styles.sectionTitle}>Order Summary</h2>

              {isSample ? (
                <div className={styles.sampleBox}>
                  <span style={{ fontSize: 32 }}>🍯</span>
                  <div>
                    <p style={{ fontWeight: 700 }}>Free Sample Request</p>
                    <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
                      We&apos;ll select a sample for you and arrange delivery via WhatsApp.
                    </p>
                  </div>
                </div>
              ) : !hydrated ? (
                /* Skeleton while cart loads from localStorage */
                <div style={{ animation: "pulse 1.5s ease-in-out infinite" }}>
                  <div style={{ height: 18, background: "var(--border-color)", borderRadius: 4, marginBottom: 10 }} />
                  <div style={{ height: 18, background: "var(--border-color)", borderRadius: 4, marginBottom: 10, width: "70%" }} />
                  <div style={{ height: 1, background: "var(--border-color)", margin: "12px 0" }} />
                  <div style={{ height: 18, background: "var(--border-color)", borderRadius: 4, marginBottom: 8 }} />
                  <div style={{ height: 24, background: "var(--border-color)", borderRadius: 4 }} />
                </div>
              ) : (
                <>
                  {items.map(item => (
                    <div key={item.variantId} className={styles.orderItem}>
                      <div className={styles.orderItemInfo}>
                        <p className={styles.orderItemName}>{item.productName}</p>
                        <p className={styles.orderItemVariant}>{item.variantName} × {item.quantity}</p>
                      </div>
                      <p className={styles.orderItemPrice}>{formatInr(item.unitPriceInr * item.quantity)}</p>
                    </div>
                  ))}
                  <div className={styles.divider} />
                  <div className={styles.summaryRow}><span>Subtotal</span><span>{formatInr(totalInr)}</span></div>
                  <div className={styles.summaryRow}>
                    <span>Shipping</span>
                    <span>{SHIPPING === 0 ? <span style={{ color: "var(--accent)" }}>FREE</span> : formatInr(SHIPPING)}</span>
                  </div>
                  <div className={[styles.summaryRow, styles.totalRow].join(" ")}><span>Total</span><span>{formatInr(grandTotal)}</span></div>
                </>
              )}

              <Button
                variant="primary" fullWidth size="lg" loading={loading}
                onClick={placeOrder}
                disabled={!hydrated || (!isSample && items.length === 0)}
                style={{ marginTop: 20 }}
              >
                {isSample ? "Submit Sample Request →" : "Place Order →"}
              </Button>

              <p className={styles.paymentNote}>🔒 Secure checkout</p>
            </div>
          </div>
        </div>
      </div>

      {/* Partial payment confirmation modal */}
      {showPartialModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>Split Payment Confirmation</h3>
            <p className={styles.modalBody}>
              Your wallet balance is <strong>{formatInr(walletBalance)}</strong>, but the order total is <strong>{formatInr(pendingTotal)}</strong>.
            </p>
            <p className={styles.modalBody}>
              We&apos;ll deduct <strong>{formatInr(walletBalance)}</strong> from your wallet, then open Razorpay for the remaining <strong>{formatInr(pendingTotal - walletBalance)}</strong>.
            </p>
            <p className={styles.modalNote}>
              If Razorpay payment fails, your wallet balance will be automatically refunded.
            </p>
            <div className={styles.modalActions}>
              <Button variant="secondary" onClick={() => { setShowPartialModal(false); router.push("/orders"); }}>Cancel</Button>
              <Button variant="primary" loading={loading} onClick={confirmPartialPayment}>Confirm & Proceed</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
