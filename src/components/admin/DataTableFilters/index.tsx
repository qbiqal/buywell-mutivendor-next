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
  exportRows?: Record<string, unknown>[];
  exportFileName?: string;
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
  exportRows = [],
  exportFileName = "admin-table",
}: DataTableFiltersProps) {
  const canExport = exportRows.length > 0;

  return (
    <section className={styles.panel} aria-label={title}>
      <div className={styles.header}>
        <div>
          <p className={styles.title}>{title}</p>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
        <div className={styles.headerActions}>
          {resultLabel && <span className={styles.resultLabel}>{resultLabel}</span>}
          {canExport && (
            <>
              <button type="button" className={styles.exportButton} onClick={() => exportCsv(exportRows, exportFileName)}>
                Export CSV
              </button>
              <button type="button" className={styles.exportButton} onClick={() => exportPdf(exportRows, exportFileName, title)}>
                Export PDF
              </button>
            </>
          )}
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

function exportCsv(rows: Record<string, unknown>[], fileName: string) {
  if (rows.length === 0) return;
  const keys = Object.keys(rows[0]);
  const csv = [
    keys.join(","),
    ...rows.map((row) => keys.map((key) => csvCell(row[key])).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileName}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function exportPdf(rows: Record<string, unknown>[], fileName: string, title: string) {
  if (rows.length === 0) return;
  const keys = Object.keys(rows[0]);
  const popup = window.open("", "_blank", "noopener,noreferrer,width=1100,height=800");
  if (!popup) return;
  popup.document.write(`<!doctype html><html><head><title>${escapeHtml(fileName)}</title><style>
    body{font-family:Arial,sans-serif;margin:24px;color:#111827}
    h1{font-size:20px;margin:0 0 16px}
    table{width:100%;border-collapse:collapse;font-size:12px}
    th,td{border:1px solid #d1d5db;padding:8px;text-align:left;vertical-align:top}
    th{background:#f3f4f6}
  </style></head><body><h1>${escapeHtml(title)}</h1><table><thead><tr>${keys.map((key) => `<th>${escapeHtml(key)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${keys.map((key) => `<td>${escapeHtml(formatValue(row[key]))}</td>`).join("")}</tr>`).join("")}</tbody></table><script>window.print();</script></body></html>`);
  popup.document.close();
}

function csvCell(value: unknown): string {
  const text = formatValue(value);
  return `"${text.replace(/"/g, "\"\"")}"`;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;",
  }[char] ?? char));
}
