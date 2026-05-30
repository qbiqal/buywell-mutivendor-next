import React from "react";
import styles from "./Spinner.module.css";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  color?: "amber" | "white" | "muted";
  className?: string;
}

export function Spinner({ size = "md", color = "amber", className = "" }: SpinnerProps) {
  return (
    <span
      className={[styles.spinner, styles[size], styles[color], className].join(" ")}
      role="status"
      aria-label="Loading"
    />
  );
}

export function PageLoader() {
  return (
    <div className={styles.pageLoader}>
      <Spinner size="lg" />
    </div>
  );
}
