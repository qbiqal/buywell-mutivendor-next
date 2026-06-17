"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import styles from "../auth.module.css";

export default function ForgotPasswordClient() {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [debugCode, setDebugCode] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!data.success) {
        showError(data.error ?? "Unable to send reset code");
        return;
      }
      setDebugCode(data.data?.debugCode ?? null);
      success("Reset code requested", "Check your email for the code");
      router.push(`/reset-password?email=${encodeURIComponent(email)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logoWrap}>
          <div className={styles.logoIcon}>AN</div>
          <h1 className={styles.logoName}>BuyWell Marketplace</h1>
        </div>
        <h2 className={styles.title}>Reset your password</h2>
        <p className={styles.subtitle}>Enter your account email and we will send a reset code.</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoFocus
          />
          {debugCode && (
            <p className={styles.helperBox}>
              Local dev code: <span className={styles.codePill}>{debugCode}</span>
            </p>
          )}
          <Button type="submit" variant="primary" fullWidth loading={loading} size="lg">
            Send Reset Code
          </Button>
        </form>

        <p className={styles.footer}>
          Remembered it? <Link href="/login" className={styles.link}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
