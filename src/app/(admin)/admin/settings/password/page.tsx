"use client";
import React, { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { Card, CardHeader, CardBody, CardFooter } from "@/components/ui/Card";

export default function AdminChangePasswordPage() {
  const { success, error: showError } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res  = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        success("Password changed successfully!");
        setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        showError(data.error ?? "Failed to change password");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: 32, maxWidth: 480 }}>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Change Password</h1>
        <p className="admin-page-subtitle">Update your admin account password</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card padding="none">
          <CardHeader><h2 style={{ fontSize: 15, fontWeight: 700 }}>New Password</h2></CardHeader>
          <CardBody>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ position: "relative" }}>
                <Input label="Current Password *" type={showCurrent ? "text" : "password"} value={form.currentPassword} onChange={set("currentPassword")} required />
                <button type="button" onClick={() => setShowCurrent((p) => !p)} style={{ position: "absolute", right: 12, top: 34, background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", fontSize: 18 }}>{showCurrent ? "🙈" : "👁"}</button>
              </div>
              <div style={{ position: "relative" }}>
                <Input label="New Password *" type={showNew ? "text" : "password"} value={form.newPassword} onChange={set("newPassword")} placeholder="Min 8 characters" required />
                <button type="button" onClick={() => setShowNew((p) => !p)} style={{ position: "absolute", right: 12, top: 34, background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", fontSize: 18 }}>{showNew ? "🙈" : "👁"}</button>
              </div>
              <div style={{ position: "relative" }}>
                <Input label="Confirm New Password *" type={showConfirm ? "text" : "password"} value={form.confirmPassword} onChange={set("confirmPassword")} required />
                <button type="button" onClick={() => setShowConfirm((p) => !p)} style={{ position: "absolute", right: 12, top: 34, background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", fontSize: 18 }}>{showConfirm ? "🙈" : "👁"}</button>
              </div>
            </div>
          </CardBody>
          <CardFooter>
            <Button type="submit" variant="primary" loading={saving}>Change Password</Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
