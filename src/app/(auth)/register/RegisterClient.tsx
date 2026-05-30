"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import styles from "../auth.module.css";

export default function RegisterClient() {
  const router   = useRouter();
  const { error: showError, success } = useToast();

  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", password: "" });
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res  = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.success) { showError(data.error ?? "Registration failed"); return; }
      success("Account created!", "Welcome to APRAS Naturals");
      router.push("/shop");
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
        <h2 className={styles.title}>Create your account</h2>
        <p className={styles.subtitle}>Join thousands who've made the switch to real</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.row}>
            <Input label="First Name" value={form.firstName} onChange={set("firstName")} placeholder="Rahul" required autoFocus />
            <Input label="Last Name"  value={form.lastName}  onChange={set("lastName")}  placeholder="Sharma" />
          </div>
          <Input label="Email"    type="email" value={form.email}    onChange={set("email")}    placeholder="you@example.com" required />
          <Input label="Phone"    type="tel"   value={form.phone}    onChange={set("phone")}    placeholder="+91 XXXXX XXXXX" />
          <Input label="Password" type="password" value={form.password} onChange={set("password")} placeholder="Min 6 characters" required />
          <Button type="submit" variant="primary" fullWidth loading={loading} size="lg">
            Create Account
          </Button>
        </form>

        <p className={styles.footer}>
          Already have an account?{" "}
          <Link href="/login" className={styles.link}>Sign in</Link>
        </p>
        <p className={styles.footer} style={{ marginTop: 8 }}>
          <Link href="/" className={styles.link}>← Back to Home</Link>
        </p>
      </div>
    </div>
  );
}
