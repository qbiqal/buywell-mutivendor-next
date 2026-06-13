"use client";
import React, { useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import styles from "./payment.module.css";

interface PaymentClientProps {
  qrUrl:            string;
  upiId:            string;
  companyName:      string;
  razorpayEnabled?: boolean;
  razorpayKeyId?:   string;
}

export default function PaymentClient({ qrUrl, upiId, companyName, razorpayEnabled = false, razorpayKeyId = "" }: PaymentClientProps) {
  const router   = useRouter();
  const params   = useSearchParams();
  const { success: showSuccess, error: showError } = useToast();

  const orderId     = params.get("orderId") ?? "";
  const orderNumber = params.get("orderNumber") ?? "";
  const uploadToken = params.get("token") ?? "";
  const totalPaise  = parseInt(params.get("total") ?? "0");
  const totalFormatted = `₹${(totalPaise / 100).toLocaleString("en-IN")}`;

  const [file,          setFile]          = useState<File | null>(null);
  const [preview,       setPreview]       = useState<string>("");
  const [uploading,     setUploading]     = useState(false);
  const [rzpLoading,    setRzpLoading]    = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleRazorpay() {
    setRzpLoading(true);
    try {
      // 1. Create Razorpay order on server
      const sessionRes = await fetch("/api/payment/razorpay/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const session = await sessionRes.json();
      if (!sessionRes.ok || !session.razorpayOrderId) {
        showError(session.error ?? "Could not create Razorpay session");
        return;
      }

      // 2. Load Razorpay checkout.js dynamically
      await new Promise<void>((resolve, reject) => {
        if ((window as unknown as Record<string, unknown>).Razorpay) { resolve(); return; }
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load Razorpay"));
        document.head.appendChild(script);
      });

      // 3. Open Razorpay modal
      await new Promise<void>((resolve, reject) => {
        const RazorpayClass = (window as unknown as Record<string, unknown>).Razorpay as new (opts: unknown) => { open(): void };
        const rzp = new RazorpayClass({
          key: razorpayKeyId,
          order_id: session.razorpayOrderId,
          amount: session.amount,
          currency: "INR",
          name: companyName,
          description: `Order ${orderNumber}`,
          prefill: { name: session.customerName, contact: session.customerPhone },
          theme: { color: "#0d7659" },
          handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
            try {
              const verifyRes = await fetch("/api/payment/razorpay/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  orderId,
                  razorpayOrderId:  response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                }),
              });
              const verifyData = await verifyRes.json();
              if (!verifyData.success) { showError("Payment verification failed. Contact support."); reject(); return; }
              showSuccess("Payment successful!", "Your order is confirmed.");
              router.push(`/checkout/confirmation?orderNumber=${orderNumber}`);
              resolve();
            } catch { showError("Verification error. Contact support."); reject(); }
          },
        });
        rzp.open();
      });
    } catch (err) {
      showError("Razorpay error. Please try another method.");
      console.error(err);
    } finally {
      setRzpLoading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function handleSubmit() {
    if (!file) { showError("Please upload your payment screenshot"); return; }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("proof", file);
      form.append("token", uploadToken);
      const res = await fetch(`/api/orders/${orderId}/upload-proof`, { method: "POST", body: form });
      const data = await res.json();
      if (!data.success) { showError(data.error ?? "Upload failed"); return; }
      showSuccess("Payment proof submitted!", "We'll verify and confirm your order shortly.");
      router.push(`/checkout/confirmation?orderNumber=${orderNumber}`);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.card}>
          {/* Header */}
          <div className={styles.header}>
            <h1 className={styles.title}>Complete Your Payment</h1>
            <p className={styles.sub}>Order <strong>{orderNumber}</strong> · Total: <strong>{totalFormatted}</strong></p>
          </div>

          {/* Razorpay option */}
          {razorpayEnabled && (
            <div className={styles.rzpSection}>
              <Button
                variant="primary"
                fullWidth
                size="lg"
                loading={rzpLoading}
                onClick={handleRazorpay}
              >
                💳 Pay Now with Razorpay
              </Button>
              <p className={styles.rzpSub}>UPI · Card · Net Banking · Wallets — Instant confirmation</p>
              <div className={styles.orDivider}><span>or pay via QR / bank transfer below</span></div>
            </div>
          )}

          <div className={styles.layout}>
            {/* Left — QR */}
            <div className={styles.qrCol}>
              <p className={styles.stepLabel}>Step 1 — Scan & Pay</p>
              <div className={styles.qrBox}>
                {qrUrl ? (
                  <Image src={qrUrl} alt="Payment QR" width={220} height={220} className={styles.qrImg} />
                ) : (
                  <div className={styles.qrPlaceholder}>
                    <span style={{ fontSize: 48 }}>📱</span>
                    <p>QR code will appear here</p>
                    <p style={{ fontSize: 12 }}>Configure in Admin → Settings</p>
                  </div>
                )}
              </div>
              {upiId && (
                <div className={styles.upiRow}>
                  <span>UPI ID:</span>
                  <button
                    onClick={() => { navigator.clipboard.writeText(upiId); }}
                    className={styles.upiId}
                    title="Click to copy"
                  >
                    {upiId} 📋
                  </button>
                </div>
              )}
              <p className={styles.payTo}>Pay to: <strong>{companyName}</strong></p>
            </div>

            {/* Right — Upload */}
            <div className={styles.uploadCol}>
              <p className={styles.stepLabel}>Step 2 — Upload Screenshot</p>
              <p className={styles.uploadHint}>
                After paying, take a screenshot of your payment confirmation and upload it here.
              </p>

              <div
                className={[styles.dropZone, preview ? styles.hasPreview : ""].join(" ")}
                onClick={() => inputRef.current?.click()}
              >
                {preview ? (
                  <Image src={preview} alt="Payment proof" fill className={styles.previewImg} />
                ) : (
                  <div className={styles.dropHint}>
                    <span style={{ fontSize: 40 }}>📸</span>
                    <p>Click to upload screenshot</p>
                    <p className={styles.dropSub}>JPG, PNG · Max 5MB</p>
                  </div>
                )}
              </div>

              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className={styles.fileInput}
              />

              {preview && (
                <button className={styles.changeBtn} onClick={() => { setFile(null); setPreview(""); }}>
                  Choose different file
                </button>
              )}

              <Button
                variant="primary"
                fullWidth
                size="lg"
                loading={uploading}
                onClick={handleSubmit}
                disabled={!file}
                style={{ marginTop: 20 }}
              >
                Submit Payment Proof →
              </Button>

              <p className={styles.whatsappNote}>
                Questions? WhatsApp: <a href="https://wa.me/919470309006">+91 9470309006</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
