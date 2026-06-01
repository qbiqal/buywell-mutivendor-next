"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";

interface ImpersonationBannerProps {
  customerEmail: string;
}

export function ImpersonationBanner({ customerEmail }: ImpersonationBannerProps) {
  const router  = useRouter();
  const [loading, setLoading] = useState(false);

  async function endImpersonation() {
    setLoading(true);
    try {
      await fetch("/api/admin/impersonate", { method: "DELETE" });
      router.push("/admin/customers");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      position: "fixed",
      top: 0, left: 0, right: 0,
      zIndex: 9999,
      background: "linear-gradient(90deg, #7C3AED, #9333EA)",
      color: "#fff",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "8px 24px",
      fontSize: 13,
      fontWeight: 600,
      boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
    }}>
      <span>
        🎭 <strong>Impersonating</strong> — viewing as <strong>{customerEmail}</strong>
      </span>
      <button
        onClick={endImpersonation}
        disabled={loading}
        style={{
          background: "rgba(255,255,255,0.2)",
          border: "1px solid rgba(255,255,255,0.4)",
          color: "#fff",
          borderRadius: 6,
          padding: "4px 14px",
          fontSize: 12,
          fontWeight: 700,
          cursor: "pointer",
          transition: "background 0.15s",
        }}
      >
        {loading ? "Returning…" : "← Back to Admin Panel"}
      </button>
    </div>
  );
}
