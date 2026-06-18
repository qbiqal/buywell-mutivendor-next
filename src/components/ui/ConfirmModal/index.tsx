"use client";
import React, { useEffect } from "react";
import styles from "./ConfirmModal.module.css";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter") onConfirm();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen, onCancel, onConfirm]);

  if (!isOpen) return null;

  const icon = variant === "danger" ? "⚠️" : variant === "warning" ? "🔔" : "ℹ️";

  return (
    <div className={styles.overlay} onClick={onCancel} role="dialog" aria-modal aria-labelledby="confirm-title">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={`${styles.iconWrap} ${styles[variant]}`}>
          <span className={styles.icon}>{icon}</span>
        </div>
        <div className={styles.body}>
          <h3 id="confirm-title" className={styles.title}>{title}</h3>
          <p className={styles.message}>{message}</p>
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={onCancel} autoFocus>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`${styles.confirmBtn} ${styles[`confirm_${variant}`]}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
