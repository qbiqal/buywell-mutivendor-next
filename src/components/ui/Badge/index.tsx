import React from "react";
import styles from "./Badge.module.css";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "amber" | "status";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  statusKey?: string;   // order status key — uses .status-{key} CSS class
  dot?: boolean;
  className?: string;
}

export function Badge({ children, variant = "default", statusKey, dot = false, className = "" }: BadgeProps) {
  const cls = statusKey
    ? [`status-${statusKey}`, styles.badge, styles.statusBadge, className].join(" ")
    : [styles.badge, styles[variant], className].join(" ");

  return (
    <span className={cls}>
      {dot && <span className={styles.dot} aria-hidden />}
      {children}
    </span>
  );
}
