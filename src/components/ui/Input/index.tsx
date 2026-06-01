"use client";
import React, { useId } from "react";
import styles from "./Input.module.css";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
}

export function Input({ label, error, hint, leftIcon, className = "", id, ...props }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? `input-${generatedId}`;
  return (
    <div className={styles.group}>
      {label && <label htmlFor={inputId} className={styles.label}>{label}</label>}
      <div className={styles.inputWrap}>
        {leftIcon && <span className={styles.leftIcon}>{leftIcon}</span>}
        <input
          id={inputId}
          {...props}
          className={[
            styles.input,
            error ? styles.hasError : "",
            leftIcon ? styles.withLeftIcon : "",
            className,
          ].filter(Boolean).join(" ")}
        />
      </div>
      {error && <p className={styles.error}>{error}</p>}
      {!error && hint && <p className={styles.hint}>{hint}</p>}
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Textarea({ label, error, hint, className = "", id, ...props }: TextareaProps) {
  const generatedId = useId();
  const textareaId = id ?? `textarea-${generatedId}`;
  return (
    <div className={styles.group}>
      {label && <label htmlFor={textareaId} className={styles.label}>{label}</label>}
      <textarea
        id={textareaId}
        {...props}
        className={[styles.textarea, error ? styles.hasError : "", className].filter(Boolean).join(" ")}
      />
      {error && <p className={styles.error}>{error}</p>}
      {!error && hint && <p className={styles.hint}>{hint}</p>}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, error, options, className = "", id, ...props }: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? `select-${generatedId}`;
  return (
    <div className={styles.group}>
      {label && <label htmlFor={selectId} className={styles.label}>{label}</label>}
      <div className={styles.selectWrap}>
        <select
          id={selectId}
          {...props}
          className={[styles.select, error ? styles.hasError : "", className].filter(Boolean).join(" ")}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <span className={styles.selectArrow}>▾</span>
      </div>
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
