"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import styles from "./NestedCategoryPicker.module.css";

export interface NestedCategory {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  color?: string | null;
  sortOrder?: number;
}

interface NestedCategoryPickerProps {
  endpoint: string;
  value: string;
  onChange: (categoryId: string) => void;
  label?: string;
  emptyLabel?: string;
  defaultColor?: string;
}

export function NestedCategoryPicker({
  endpoint,
  value,
  onChange,
  label = "Category",
  emptyLabel = "Uncategorized",
  defaultColor = "#D97706",
}: NestedCategoryPickerProps) {
  const [categories, setCategories] = useState<NestedCategory[]>([]);
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const [color, setColor] = useState(defaultColor);
  const [saving, setSaving] = useState(false);

  async function load() {
    const json = await fetch(endpoint).then((res) => res.json());
    if (json.success) setCategories(json.data);
  }

  useEffect(() => { load().catch(() => {}); }, [endpoint]);

  const options = useMemo(() => flattenCategories(categories), [categories]);

  async function createCategory() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, parentId: parentId || null, color }),
      });
      const json = await res.json();
      if (json.success) {
        await load();
        onChange(json.data.id);
        setName("");
        setParentId("");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.field}>
        <span>{label}</span>
        <SearchableSelect options={options} value={value} onChange={onChange} emptyLabel={emptyLabel} />
      </div>

      <div className={styles.creator}>
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="New category name" />
        <SearchableSelect options={options} value={parentId} onChange={setParentId} emptyLabel="Top level" />
        <input type="color" value={color} onChange={(event) => setColor(event.target.value)} aria-label="Category color" />
        <button type="button" onClick={createCategory} disabled={saving || !name.trim()}>
          Add
        </button>
      </div>
    </div>
  );
}

type CategoryOption = NestedCategory & { depth: number; path: string };

function flattenCategories(categories: NestedCategory[]) {
  const byParent = new Map<string, NestedCategory[]>();
  for (const category of categories) {
    const key = category.parentId || "root";
    byParent.set(key, [...(byParent.get(key) ?? []), category]);
  }
  for (const group of byParent.values()) {
    group.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name));
  }
  const result: CategoryOption[] = [];
  function walk(parentId: string, depth: number, trail: string[] = []) {
    for (const category of byParent.get(parentId) ?? []) {
      const path = [...trail, category.name];
      result.push({ ...category, depth, path: path.join(" › ") });
      walk(category.id, depth + 1, path);
    }
  }
  walk("root", 0);
  return result;
}

function SearchableSelect({
  options,
  value,
  onChange,
  emptyLabel,
}: {
  options: CategoryOption[];
  value: string;
  onChange: (id: string) => void;
  emptyLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const selected = options.find((o) => o.id === value);
  const needle = query.trim().toLowerCase();
  const filtered = needle
    ? options.filter((o) => o.path.toLowerCase().includes(needle))
    : options;

  function pick(id: string) {
    onChange(id);
    setOpen(false);
    setQuery("");
  }

  return (
    <div className={styles.combo} ref={rootRef}>
      <button
        type="button"
        className={styles.comboTrigger}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={selected ? undefined : styles.placeholder}>{selected ? selected.path : emptyLabel}</span>
        <span aria-hidden>▾</span>
      </button>
      {open && (
        <div className={styles.comboPanel}>
          <input
            autoFocus
            className={styles.comboSearch}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpen(false);
              if (e.key === "Enter") { e.preventDefault(); if (filtered[0]) pick(filtered[0].id); }
            }}
            placeholder="Search categories…"
          />
          <ul className={styles.comboList} role="listbox">
            <li>
              <button type="button" className={styles.comboOption} onClick={() => pick("")}>{emptyLabel}</button>
            </li>
            {filtered.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={o.id === value}
                  className={`${styles.comboOption} ${o.id === value ? styles.comboActive : ""}`}
                  style={{ paddingLeft: needle ? 12 : 12 + o.depth * 16 }}
                  onClick={() => pick(o.id)}
                >
                  {needle ? o.path : o.name}
                </button>
              </li>
            ))}
            {filtered.length === 0 && <li className={styles.comboEmpty}>No categories match “{query}”</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
