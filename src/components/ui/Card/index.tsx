import React from "react";
import styles from "./Card.module.css";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
  hover?: boolean;
  noBorder?: boolean;
}

export function Card({ children, className = "", padding = "md", hover = false, noBorder = false }: CardProps) {
  return (
    <div className={[
      styles.card,
      styles[`pad-${padding}`],
      hover ? styles.hover : "",
      noBorder ? styles.noBorder : "",
      className,
    ].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={[styles.header, className].join(" ")}>{children}</div>;
}

export function CardBody({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={[styles.body, className].join(" ")}>{children}</div>;
}

export function CardFooter({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={[styles.footer, className].join(" ")}>{children}</div>;
}
