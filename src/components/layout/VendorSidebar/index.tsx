"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import styles from "./VendorSidebar.module.css";

const NAV_ITEMS = [
  { label: "Dashboard",  href: "/vendor/dashboard",  icon: "📊" },
  { label: "Products",   href: "/vendor/products",    icon: "🛍️" },
  { label: "Orders",     href: "/vendor/orders",      icon: "📦" },
  { label: "Payouts",    href: "/vendor/payouts",     icon: "💸" },
  { label: "Settings",   href: "/vendor/settings",    icon: "⚙️" },
];

interface VendorSidebarProps {
  storeName?: string;
  logoUrl?: string;
}

export function VendorSidebar({ storeName = "My Store", logoUrl = "" }: VendorSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setMobileOpen(false);
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        className={styles.mobileMenuBtn}
        onClick={() => setMobileOpen(true)}
        aria-label="Open vendor menu"
      >
        ☰
      </button>
      {mobileOpen && <button type="button" className={styles.mobileOverlay} aria-label="Close vendor menu" onClick={() => setMobileOpen(false)} />}
      <aside className={[styles.sidebar, collapsed ? styles.collapsed : "", mobileOpen ? styles.mobileOpen : ""].join(" ")}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>
            {logoUrl ? <img src={logoUrl} alt={storeName} /> : "🏪"}
          </div>
          {!collapsed && (
            <div className={styles.logoText}>
              <span className={styles.logoName}>{storeName}</span>
              <span className={styles.logoSub}>Vendor Panel</span>
            </div>
          )}
        </div>

        <button
          className={styles.collapseBtn}
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? "›" : "‹"}
        </button>
        <button
          type="button"
          className={styles.mobileCloseBtn}
          onClick={() => setMobileOpen(false)}
          aria-label="Close vendor menu"
        >
          ×
        </button>

        <nav className={styles.nav}>
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[styles.navItem, isActive ? styles.active : ""].join(" ")}
                title={collapsed ? item.label : undefined}
                onClick={() => setMobileOpen(false)}
              >
                <span className={styles.navIcon}>{item.icon}</span>
                {!collapsed && <span className={styles.navLabel}>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className={styles.bottom}>
          <Link href="/" className={styles.viewSiteLink} title="View Site" onClick={() => setMobileOpen(false)}>
            <span>🌐</span>
            {!collapsed && <span>View Site</span>}
          </Link>
          <button onClick={handleLogout} className={styles.logoutBtn} title="Logout">
            <span>🚪</span>
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
