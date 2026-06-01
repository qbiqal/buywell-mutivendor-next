"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import styles from "./AdminTopbar.module.css";

const TITLES: Array<{ prefix: string; title: string }> = [
  { prefix: "/admin/dashboard", title: "Dashboard" },
  { prefix: "/admin/orders", title: "Orders" },
  { prefix: "/admin/products", title: "Products" },
  { prefix: "/admin/customers", title: "Customers" },
  { prefix: "/admin/media", title: "Media Library" },
  { prefix: "/admin/analytics", title: "Analytics" },
  { prefix: "/admin/whatsapp", title: "WhatsApp" },
  { prefix: "/admin/blog", title: "Blog" },
  { prefix: "/admin/cms", title: "CMS" },
  { prefix: "/admin/settings", title: "Settings" },
];

export function AdminTopbar() {
  const pathname = usePathname();
  const title = TITLES.find((item) => pathname.startsWith(item.prefix))?.title ?? "Admin";

  return (
    <header className={styles.topbar}>
      <div>
        <p className={styles.kicker}>APRAS Admin</p>
        <h2>{title}</h2>
      </div>
      <div className={styles.actions}>
        <ThemeToggle />
      </div>
    </header>
  );
}

