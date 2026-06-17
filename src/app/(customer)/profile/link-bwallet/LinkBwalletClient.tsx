"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import styles from "./link-bwallet.module.css";

export default function LinkBwalletClient() {
  const [step, setStep] = useState(1); // 1: Identifier, 2: OTP
  const [identifier, setIdentifier] = useState("");
  const [type, setType] = useState<"phone" | "email">("phone");
  const [otp, setOtp] = useState("");
  const [bwUserId, setBwUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/bwallet-link-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, type }),
      });
      const data = await res.json();
      if (data.success) {
        setBwUserId(data.bwUserId);
        setStep(2);
        toast({ type: "success", title: "OTP Sent", message: `OTP sent to your ${type} registered with BuyWell Global.` });
      } else {
        toast({ type: "error", title: "Error", message: data.error || "User not found" });
      }
    } catch (err) {
      toast({ type: "error", title: "Error", message: "Failed to send OTP" });
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/bwallet-verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bwUserId, otp }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ type: "success", title: "Success", message: "Account linked successfully!" });
        router.push("/profile");
        router.refresh();
      } else {
        toast({ type: "error", title: "Error", message: data.error || "Invalid OTP" });
      }
    } catch (err) {
      toast({ type: "error", title: "Error", message: "Verification failed" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Link BuyWell Global Account</h1>
        <p className={styles.subtitle}>
          Link your account to use your e-commerce wallet balance for purchases.
        </p>

        {step === 1 ? (
          <form onSubmit={handleSendOtp} className={styles.form}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Identifier Type</label>
              <div className={styles.radioGroup}>
                <label className={styles.radioLabel}>
                  <input type="radio" checked={type === "phone"} onChange={() => setType("phone")} />
                  Phone Number
                </label>
                <label className={styles.radioLabel}>
                  <input type="radio" checked={type === "email"} onChange={() => setType("email")} />
                  Email Address
                </label>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>{type === "phone" ? "Phone Number" : "Email Address"}</label>
              <input
                type={type === "phone" ? "tel" : "email"}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={type === "phone" ? "e.g. 9876543210" : "e.g. user@example.com"}
                required
                className={styles.input}
              />
            </div>

            <button type="submit" disabled={loading} className={styles.button}>
              {loading ? "Checking..." : "Send OTP"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className={styles.form}>
            <p className={styles.info}>
              Enter the 6-digit OTP sent to your registered {type}.
            </p>
            <div className={styles.formGroup}>
              <label className={styles.label}>OTP Code</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="6-digit code"
                maxLength={6}
                required
                className={styles.input}
                autoFocus
              />
            </div>

            <button type="submit" disabled={loading} className={styles.button}>
              {loading ? "Verifying..." : "Verify & Link"}
            </button>
            <button type="button" onClick={() => setStep(1)} className={styles.backButton}>
              ← Change {type}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
