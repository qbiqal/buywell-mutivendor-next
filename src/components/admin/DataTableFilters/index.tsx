"use client";

import React from "react";
import { Input } from "@/components/ui/Input";
import styles from "./DataTableFilters.module.css";

export interface FilterOption {
  value: string;
  label: string;
}

export interface DataTableFilterField {
  key: string;
  label: string;
  value: string;
  type?: "text" | "select" | "date" | "number";
  placeholder?: string;
  options?: FilterOption[];
  min?: number;
  step?: number;
  onChange: (value: string) => void;
}

interface DataTableFiltersProps {
  title?: string;
  subtitle?: string;
  searchValue: string;
  searchPlaceholder: string;
  onSearchChange: (value: string) => void;
  fields?: DataTableFilterField[];
  onReset?: () => void;
  resultLabel?: string;
}

export function DataTableFilters({
  title = "Filters",
  subtitle,
  searchValue,
  searchPlaceholder,
  onSearchChange,
  fields = [],
  onReset,
  resultLabel,
}: DataTableFiltersProps) {
  return (
    <section className={styles.panel} aria-label={title}>
      <div className={styles.header}>
        <div>
          <p className={styles.title}>{title}</p>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
        <div className={styles.headerActions}>
          {resultLabel && <span className={styles.resultLabel}>{resultLabel}</span>}
          {onReset && (
            <button type="button" className={styles.resetButton} onClick={onReset}>
              Reset
            </button>
          )}
        </div>
      </div>

      <div className={styles.grid}>
        <label className={`${styles.field} ${styles.searchField}`}>
          <span>Search</span>
          <Input
            value={searchValue}
            placeholder={searchPlaceholder}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </label>

        {fields.map((field) => (
          <label key={field.key} className={styles.field}>
            <span>{field.label}</span>
            {field.type === "select" ? (
              <select value={field.value} onChange={(event) => field.onChange(event.target.value)}>
                {(field.options ?? []).map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            ) : (
              <input
                type={field.type ?? "text"}
                value={field.value}
                min={field.min}
                step={field.step}
                placeholder={field.placeholder}
                onChange={(event) => field.onChange(event.target.value)}
              />
            )}
          </label>
        ))}
      </div>
    </section>
  );
}

