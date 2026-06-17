"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import styles from "../auth.module.css";

type LoginMode = "email" | "buywell";

export default function LoginClient() {
  const router      = useRouter();
  const params      = useSearchParams();
  const { error: showError } = useToast();

  const [mode,         setMode]         = useState<LoginMode>("buywell");
  const [email,        setEmail]        = useState("");
  const [username,     setUsername]     = useState("");
  const [password,     setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading,      setLoading]      = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const endpoint = mode === "buywell" ? "/api/auth/buywell-login" : "/api/auth/login";
      const body = mode === "buywell"
        ? { username: username.trim(), password }
        : { email, password };

      const res  = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!data.success) {
        showError(data.error ?? "Login failed");
        return;
      }

      const redirect = params.get("redirect");
      const isAdmin = data.data.role === "admin" || data.data.role === "qbiqal";
      router.push(redirect && redirect.startsWith("/") ? redirect : (isAdmin ? "/admin/dashboard" : "/orders"));
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
          <h1 className={styles.logoName}>BuyWell Marketplace</h1>
        </div>
        <h2 className={styles.title}>Welcome back</h2>
        <p className={styles.subtitle}>Sign in to your account</p>

        {/* Login mode toggle — BuyWell Member first */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, background: "var(--color-surface, #f5f5f5)", borderRadius: 8, padding: 4 }}>
          <button
            type="button"
            onClick={() => setMode("buywell")}
            style={{
              flex: 1, padding: "8px 12px", borderRadius: 6, border: "none", cursor: "pointer",
              background: mode === "buywell" ? "var(--color-primary, #0d7659)" : "transparent",
              color: mode === "buywell" ? "#fff" : "var(--color-text, #333)",
              fontWeight: mode === "buywell" ? 600 : 400, fontSize: 14, transition: "all 0.15s",
            }}
          >
            BuyWell Member
          </button>
          <button
            type="button"
            onClick={() => setMode("email")}
            style={{
              flex: 1, padding: "8px 12px", borderRadius: 6, border: "none", cursor: "pointer",
              background: mode === "email" ? "var(--color-primary, #0d7659)" : "transparent",
              color: mode === "email" ? "#fff" : "var(--color-text, #333)",
              fontWeight: mode === "email" ? 600 : 400, fontSize: 14, transition: "all 0.15s",
            }}
          >
            Email Login
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {mode === "email" ? (
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus
            />
          ) : (
            <>
              <Input
                label="BuyWell Username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. BUY2"
                required
                autoFocus
              />
              <p style={{ fontSize: 12, color: "var(--color-text-muted, #888)", margin: "-8px 0 4px" }}>
                Use your BuyWell MLM username and password to sign in.
              </p>
            </>
          )}
          {/* Password with show/hide toggle */}
          <div style={{ position: "relative" }}>
            <Input
              label="Password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(p => !p)}
              style={{
                position: "absolute", right: 12, bottom: 13,
                background: "none", border: "none", cursor: "pointer",
                color: "var(--text-secondary, #888)", padding: 4, display: "flex", alignItems: "center",
              }}
              tabIndex={-1}
            >
              <span className="material-icons" style={{ fontSize: 20 }}>
                {showPassword ? "visibility_off" : "visibility"}
              </span>
            </button>
          </div>
          {mode === "email" && (
            <Link href="/forgot-password" className={styles.formLink}>Forgot password?</Link>
          )}
          <Button type="submit" variant="primary" fullWidth loading={loading} size="lg">
            {mode === "buywell" ? "Sign In with BuyWell" : "Sign In"}
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
