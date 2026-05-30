"use client";
import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./AdminSidebar.module.css";

const NAV_ITEMS = [
  { label: "Dashboard",   href: "/admin/dashboard",  icon: "📊" },
  { label: "Orders",      href: "/admin/orders",      icon: "📦", badge: "orders" },
  { label: "Products",    href: "/admin/products",    icon: "🛍️" },
  { label: "Customers",   href: "/admin/customers",   icon: "👥" },
  { label: "Blog",        href: "/admin/blog",        icon: "📝" },
  { label: "Media",       href: "/admin/media",       icon: "🖼️" },
  { label: "CMS",         href: "/admin/cms",         icon: "🎨" },
  { label: "WhatsApp",    href: "/admin/whatsapp",    icon: "💬" },
  { label: "Analytics",   href: "/admin/analytics",   icon: "📈" },
  { label: "Settings",    href: "/admin/settings",    icon: "⚙️" },
];

interface AdminSidebarProps {
  pendingOrders?: number;
}

export function AdminSidebar({ pendingOrders = 0 }: AdminSidebarProps) {
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
          {NAV_ITEMS.map((item) => {
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
          <Link href="/" className={styles.viewSiteLink} title="View Site">
            <span>🌐</span>
            {!collapsed && <span>View Site</span>}
          </Link>
        </div>
      </aside>
    </>
  );
}
