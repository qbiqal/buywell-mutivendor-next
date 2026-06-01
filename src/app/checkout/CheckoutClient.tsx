"use client";
import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCart } from "@/components/shop/Cart/CartContext";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { formatInr } from "@/lib/utils";
import styles from "./checkout.module.css";

type AuthStatus = "checking" | "loggedIn" | "guest";
type AccountMode = "guest" | "create";

export default function CheckoutClient() {
  const router      = useRouter();
  const params      = useSearchParams();
  const { items, totalInr, clearCart } = useCart();
  const { error: showError } = useToast();

  const isSample = params.get("sample") === "true";

  const [loading, setLoading] = useState(false);
  const [notes,   setNotes]   = useState("");
  const [address, setAddress] = useState({
    name: "", phone: "", line1: "", line2: "", city: "", state: "", pincode: "",
  });
  const set = (k: keyof typeof address) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setAddress((p) => ({ ...p, [k]: e.target.value }));

  // Auth / account creation
  const [authStatus,   setAuthStatus]   = useState<AuthStatus>("checking");
  const [accountMode,  setAccountMode]  = useState<AccountMode>("guest");
  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setAuthStatus(d?.success ? "loggedIn" : "guest"))
      .catch(() => setAuthStatus("guest"));
  }, []);

  const SHIPPING = totalInr >= 99900 ? 0 : 6000;
  const grandTotal = totalInr + SHIPPING;

  async function placeOrder() {
    setLoading(true);
    try {
      // If guest chose to create an account, register first
      if (authStatus === "guest" && accountMode === "create") {
        const nameParts = address.name.trim().split(/\s+/);
        const firstName = nameParts[0] || "Customer";
        const lastName  = nameParts.slice(1).join(" ") || undefined;
        const regRes = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, firstName, lastName, phone: address.phone }),
        });
        const regData = await regRes.json();
        if (!regData.success) {
          showError(regData.error ?? "Could not create account. Please try again.");
          return;
        }
      }

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: isSample ? [] : items.map((i) => ({
            variantId:    i.variantId,
            productName:  i.productName,
            variantName:  i.variantName,
            imageUrl:     i.imageUrl,
            unitPriceInr: i.unitPriceInr,
            quantity:     i.quantity,
          })),
          address,
          notes,
          isSampleRequest: isSample,
        }),
      });
      const data = await res.json();
      if (!data.success) { showError(data.error ?? "Failed to place order"); return; }

      if (!isSample) clearCart();
      const paymentParams = new URLSearchParams({
        orderId:     data.data.orderId,
        orderNumber: data.data.orderNumber,
        total:       String(data.data.totalInr),
        token:       data.data.uploadToken,
      });
      router.push(`/checkout/payment?${paymentParams.toString()}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>{isSample ? "Request Free Sample" : "Checkout"}</h1>

        <div className={styles.layout}>
          {/* Left — form */}
          <div className={styles.formCol}>

            {/* Account section — shown only to guests */}
            {authStatus === "guest" && (
              <div className={styles.section} style={{ marginBottom: 20 }}>
                <h2 className={styles.sectionTitle}>Your Account</h2>
                <div className={styles.accountToggleRow}>
                  <label className={[styles.accountOption, accountMode === "guest" ? styles.accountOptionActive : ""].join(" ")}>
                    <input
                      type="radio"
                      name="accountMode"
                      value="guest"
                      checked={accountMode === "guest"}
                      onChange={() => setAccountMode("guest")}
                    />
                    <span className={styles.accountOptionText}>
                      <strong>Continue as Guest</strong>
                      <small>No account needed</small>
                    </span>
                  </label>
                  <label className={[styles.accountOption, accountMode === "create" ? styles.accountOptionActive : ""].join(" ")}>
                    <input
                      type="radio"
                      name="accountMode"
                      value="create"
                      checked={accountMode === "create"}
                      onChange={() => setAccountMode("create")}
                    />
                    <span className={styles.accountOptionText}>
                      <strong>Create an Account</strong>
                      <small>Track orders after checkout</small>
                    </span>
                  </label>
                </div>

                {accountMode === "create" && (
                  <div className={styles.accountFields}>
                    <Input
                      label="Email Address *"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                    />
                    <div className={styles.fieldGroup}>
                      <label className={styles.fieldLabel}>Password *</label>
                      <div className={styles.passwordWrap}>
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Min. 6 characters"
                          className={styles.passwordInput}
                          required
                        />
                        <button
                          type="button"
                          className={styles.eyeBtn}
                          onClick={() => setShowPassword((p) => !p)}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          <span className="material-icons">
                            {showPassword ? "visibility_off" : "visibility"}
                          </span>
                        </button>
                      </div>
                      <p className={styles.fieldHint}>You can log in after checkout with these credentials.</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Delivery address */}
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Delivery Address</h2>
              <div className={styles.formFields}>
                <div className={styles.formGrid}>
                  <Input label="Full Name *"   value={address.name}    onChange={set("name")}    placeholder="Rahul Sharma"     required />
                  <Input label="Phone *"        type="tel" value={address.phone}   onChange={set("phone")}   placeholder="+91 XXXXX XXXXX" required />
                </div>
                <Input label="Address Line 1 *" value={address.line1}  onChange={set("line1")}   placeholder="House/Flat number, street" required />
                <Input label="Address Line 2 (Optional)" value={address.line2} onChange={set("line2")} placeholder="Area, landmark" />
                <div className={styles.formGrid}>
                  <Input label="City *"    value={address.city}    onChange={set("city")}    placeholder="Ranchi"    required />
                  <Input label="State *"   value={address.state}   onChange={set("state")}   placeholder="Jharkhand" required />
                  <Input label="Pincode *" value={address.pincode} onChange={set("pincode")} placeholder="834005"    required />
                </div>
                <Textarea label="Notes (Optional)" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any delivery instructions?" />
              </div>
            </div>
          </div>

          {/* Right — summary */}
          <div className={styles.summaryCol}>
            <div className={styles.summaryCard}>
              <h2 className={styles.sectionTitle}>Order Summary</h2>

              {isSample ? (
                <div className={styles.sampleBox}>
                  <span style={{ fontSize: 32 }}>🍯</span>
                  <div>
                    <p style={{ fontWeight: 700 }}>Free Sample Request</p>
                    <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
                      We&apos;ll select a sample honey variety for you. We&apos;ll contact you via WhatsApp to arrange delivery.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {items.map((item) => (
                    <div key={item.variantId} className={styles.orderItem}>
                      <div className={styles.orderItemInfo}>
                        <p className={styles.orderItemName}>{item.productName}</p>
                        <p className={styles.orderItemVariant}>{item.variantName} × {item.quantity}</p>
                      </div>
                      <p className={styles.orderItemPrice}>{formatInr(item.unitPriceInr * item.quantity)}</p>
                    </div>
                  ))}
                  <div className={styles.divider} />
                  <div className={styles.summaryRow}>
                    <span>Subtotal</span><span>{formatInr(totalInr)}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span>Shipping</span>
                    <span>{SHIPPING === 0 ? <span style={{ color: "var(--accent)" }}>FREE</span> : formatInr(SHIPPING)}</span>
                  </div>
                  <div className={[styles.summaryRow, styles.totalRow].join(" ")}>
                    <span>Total</span><span>{formatInr(grandTotal)}</span>
                  </div>
                </>
              )}

              <Button
                variant="primary"
                fullWidth
                size="lg"
                loading={loading}
                onClick={placeOrder}
                disabled={!isSample && items.length === 0}
                style={{ marginTop: 20 }}
              >
                {isSample ? "Submit Sample Request →" : "Proceed to Payment →"}
              </Button>

              <p className={styles.paymentNote}>
                💳 Pay via UPI QR after placing order
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
