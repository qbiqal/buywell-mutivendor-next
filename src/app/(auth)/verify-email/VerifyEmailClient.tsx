"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import styles from "../auth.module.css";

export default function VerifyEmailClient() {
  const router = useRouter();
  const params = useSearchParams();
  const { success, error: showError } = useToast();
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [debugCode, setDebugCode] = useState<string | null>(null);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!data.success) {
        showError(data.error ?? "Verification failed");
        return;
      }
      success("Email verified");
      router.push("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    if (!email) {
      showError("Enter your email first");
      return;
    }
    setResending(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!data.success) {
        showError(data.error ?? "Unable to resend code");
        return;
      }
      setDebugCode(data.data?.debugCode ?? null);
      success("Verification code sent");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logoWrap}>
          <div className={styles.logoIcon}>AN</div>
          <h1 className={styles.logoName}>BuyWell Marketplace</h1>
        </div>
        <h2 className={styles.title}>Verify your email</h2>
        <p className={styles.subtitle}>Enter the code sent after registration.</p>

        <form onSubmit={handleVerify} className={styles.form}>
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required autoFocus />
          <Input label="Verification Code" inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} placeholder="6-digit code" required />
          {debugCode && (
            <p className={styles.helperBox}>
              Local dev code: <span className={styles.codePill}>{debugCode}</span>
            </p>
          )}
          <Button type="submit" variant="primary" fullWidth loading={loading} size="lg">
            Verify Email
          </Button>
          <Button type="button" variant="outline" fullWidth loading={resending} onClick={resend}>
            Resend Code
          </Button>
        </form>

        <p className={styles.footer}>
          <Link href="/login" className={styles.link}>Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
