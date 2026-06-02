"use client";
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const VISITOR_KEY = "apras_visitor_id";
const SESSION_KEY = "apras_session_id";

export function TrafficTracker({ enabled = true }: { enabled?: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!enabled || !pathname || pathname.startsWith("/admin") || pathname.startsWith("/api")) return;

    const query = searchParams.toString();
    const path = query ? `${pathname}?${query}` : pathname;
    const payload = JSON.stringify({
      path,
      referrer: document.referrer,
      source: searchParams.get("utm_source") ?? "",
      medium: searchParams.get("utm_medium") ?? "",
      campaign: searchParams.get("utm_campaign") ?? "",
      visitorId: getOrCreateId(localStorage, VISITOR_KEY),
      sessionId: getOrCreateId(sessionStorage, SESSION_KEY),
    });

    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon("/api/analytics/traffic", blob);
      return;
    }

    fetch("/api/analytics/traffic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  }, [enabled, pathname, searchParams]);

  return null;
}

function getOrCreateId(storage: Storage, key: string): string {
  const existing = storage.getItem(key);
  if (existing) return existing;
  const value = crypto.randomUUID();
  storage.setItem(key, value);
  return value;
}
