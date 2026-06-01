"use client";
import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
}

export function AdminSidebar({ pendingOrders = 0, navItems = FALLBACK_NAV_ITEMS, viewSiteHref = "/" }: AdminSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      <aside className={[styles.sidebar, collapsed ? styles.collapsed : ""].join(" ")}>
        {/* Logo */}
        <div className={styles.logo}>
          <div className={styles.logoIcon}>🍯</div>
          {!collapsed && (
            <div className={styles.logoText}>
              <span className={styles.logoName}>APRAS</span>
              <span className={styles.logoSub}>Admin Panel</span>
            </div>
          )}
          <button
            className={styles.collapseBtn}
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? "→" : "←"}
          </button>
        </div>

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
          <Link href={viewSiteHref} className={styles.viewSiteLink} title="View Site">
            <span>🌐</span>
            {!collapsed && <span>View Site</span>}
          </Link>
        </div>
      </aside>
    </>
  );
}
