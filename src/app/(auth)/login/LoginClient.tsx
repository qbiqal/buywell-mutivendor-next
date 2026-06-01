"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import styles from "../auth.module.css";

export default function LoginClient() {
  const router      = useRouter();
  const params      = useSearchParams();
  const { error: showError } = useToast();

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res  = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!data.success) {
        showError(data.error ?? "Login failed");
        return;
      }

      const redirect = params.get("redirect");
      router.push(redirect && redirect.startsWith("/") ? redirect : (data.data.role === "admin" ? "/admin/dashboard" : "/orders"));
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logoWrap}>
          <div className={styles.logoIcon}>🍯</div>
          <h1 className={styles.logoName}>APRAS Naturals</h1>
        </div>
        <h2 className={styles.title}>Welcome back</h2>
        <p className={styles.subtitle}>Sign in to your account</p>

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
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
          <Link href="/forgot-password" className={styles.formLink}>Forgot password?</Link>
          <Button type="submit" variant="primary" fullWidth loading={loading} size="lg">
            Sign In
          </Button>
        </form>

        <p className={styles.footer}>
          Don't have an account?{" "}
          <Link href="/register" className={styles.link}>Create one</Link>
        </p>
        <p className={styles.footer} style={{ marginTop: 8 }}>
          <Link href="/" className={styles.link}>Back to Home</Link>
        </p>
      </div>
    </div>
  );
}
