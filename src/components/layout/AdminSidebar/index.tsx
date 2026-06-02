"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import styles from "./AdminSidebar.module.css";

export interface AdminNavItem {
  label: string;
  href: string;
  icon?: string;
  badge?: string;
}

const FALLBACK_NAV_ITEMS: AdminNavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: "📊" },
  { label: "Settings", href: "/admin/settings", icon: "⚙️" },
];

interface AdminSidebarProps {
  pendingOrders?: number;
  navItems?: AdminNavItem[];
  viewSiteHref?: string;
  logoUrl?: string;
  siteName?: string;
}

export function AdminSidebar({ pendingOrders = 0, navItems = FALLBACK_NAV_ITEMS, viewSiteHref = "/", logoUrl = "", siteName = "APRAS" }: AdminSidebarProps) {
  const pathname  = usePathname();
  const router    = useRouter();
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
        aria-label="Open admin menu"
        aria-expanded={mobileOpen}
      >
        ☰
      </button>
      {mobileOpen && <button type="button" className={styles.mobileOverlay} aria-label="Close admin menu" onClick={() => setMobileOpen(false)} />}
      <aside className={[styles.sidebar, collapsed ? styles.collapsed : "", mobileOpen ? styles.mobileOpen : ""].join(" ")}>
        {/* Logo + collapse toggle */}
        <div className={styles.logo}>
          <div className={styles.logoIcon}>
            {logoUrl ? <img src={logoUrl} alt={`${siteName} admin logo`} /> : "🍯"}
          </div>
          {!collapsed && (
            <div className={styles.logoText}>
              <span className={styles.logoName}>{siteName}</span>
              <span className={styles.logoSub}>Admin Panel</span>
            </div>
          )}
        </div>
        {/* Collapse / expand button — always visible outside logo so it's clickable in both states */}
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
          aria-label="Close admin menu"
        >
          ×
        </button>

        {/* Nav */}
        <nav className={styles.nav}>
          {navItems.map((item) => {
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
                {!collapsed && item.badge === "orders" && pendingOrders > 0 && (
                  <span className={styles.navBadge}>{pendingOrders}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className={styles.bottom}>
          <Link href={viewSiteHref} className={styles.viewSiteLink} title="View Site" onClick={() => setMobileOpen(false)}>
            <span>🌐</span>
            {!collapsed && <span>View Site</span>}
          </Link>
          <button
            onClick={handleLogout}
            className={styles.logoutBtn}
            title="Logout"
          >
            <span>🚪</span>
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
