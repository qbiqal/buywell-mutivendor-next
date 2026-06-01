"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import styles from "../auth.module.css";

export default function ResetPasswordClient() {
  const router = useRouter();
  const params = useSearchParams();
  const { success, error: showError } = useToast();
  const [form, setForm] = useState({
    email: params.get("email") ?? "",
    code: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [key]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.success) {
        showError(data.error ?? "Password reset failed");
        return;
      }
      success("Password updated", "You can sign in with your new password");
      router.push("/login");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logoWrap}>
          <div className={styles.logoIcon}>AN</div>
          <h1 className={styles.logoName}>APRAS Naturals</h1>
        </div>
        <h2 className={styles.title}>Enter reset code</h2>
        <p className={styles.subtitle}>Use the code sent to your email and choose a new password.</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <Input label="Email" type="email" value={form.email} onChange={set("email")} placeholder="you@example.com" required autoFocus />
          <Input label="Reset Code" inputMode="numeric" value={form.code} onChange={set("code")} placeholder="6-digit code" required />
          <Input label="New Password" type="password" value={form.password} onChange={set("password")} placeholder="Min 6 characters" required />
          <Button type="submit" variant="primary" fullWidth loading={loading} size="lg">
            Update Password
          </Button>
        </form>

        <p className={styles.footer}>
          Need a new code? <Link href="/forgot-password" className={styles.link}>Request again</Link>
        </p>
      </div>
    </div>
  );
}
